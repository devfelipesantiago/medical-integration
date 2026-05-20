# Medical Integration API

API REST para integração de pedidos de exame, documentos e chegada de imagens DICOM, desenvolvida com NestJS + TypeORM + SQLite.

---

## Decisões técnicas

### Framework: NestJS
Escolhido por oferecer uma estrutura modular que facilita a separação de camadas (Controller → Service → Repository), injeção de dependência nativa, pipes de validação integrados e boa legibilidade para revisão de código. Para respeitar o Dependency Inversion Principle, controllers e serviços dependem de contratos, não de implementações concretas. Isso também tornou os testes mais simples, já que mockar uma interface é mais direto do que mockar uma classe com repositórios injetados. E como efeito colateral, abre espaço para trocar implementações sem propagar mudanças pelo código.

### Banco de dados: SQLite (via better-sqlite3)
Escolhido para simplificar a execução com Docker sem depender de um container extra (PostgreSQL/MySQL). O TypeORM com `synchronize: true` cria as tabelas automaticamente na primeira execução. Em produção real, bastaria trocar o driver e desativar o `synchronize`.

### ORM: TypeORM
Integração nativa com NestJS, suporte a decorators TypeScript e repositórios tipados — mantendo o código expressivo sem abrir mão de controle sobre as queries.

### Logs estruturados: Winston (nest-winston)
Todos os eventos de negócio (pedido recebido, integração ativada, documento vinculado) são logados em JSON com timestamp, facilitando agregação por ferramentas como Datadog ou CloudWatch.

### Modelagem de entidades

| Entidade | Chave | Observação |
|---|---|---|
| `Pedido` | `codigoPedido` (PK natural) | Reflete o identificador de negócio |
| `ExameItemPedido` | `id` (auto) | Item de exame dentro do pedido; unique em `(codigoItemPedido, pedidoCodigoPedido)` |
| `Documento` | `id` (auto) | Unique em `(codigoDocumento, codigoPedido)` para evitar duplicatas |
| `Exame` | `accessionNumber` (PK natural) | Representa a chegada da imagem DICOM |

### Campo `examesVinculados` no Documento
Como a vinculação é N:M (um documento pode estar vinculado a vários exames do pedido), optei por serializar os accessionNumbers como JSON text no SQLite, evitando uma tabela extra de join. Em um cenário de alta escala, uma tabela de associação seria mais adequada.

---

## Como executar

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/)

### Com Docker Compose (recomendado)

```bash
# Clonar / entrar no diretório do projeto
git clone <repo> && cd medical-integration

# Subir a aplicação
docker compose up --build

# A API estará disponível em http://localhost:3000
```

### Sem Docker (desenvolvimento local)

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento (watch)
npm run start:dev

# Ou build de produção
npm run build && npm run start:prod
```

### Testes

```bash
# Rodar todos os testes unitários
npm test

# Com cobertura
npm run test:cov

# Watch mode
npm run test:watch
```

---

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/pedidos` | Criar ou atualizar pedido |
| `GET` | `/pedidos/:codigoPedido` | Buscar pedido por código |
| `POST` | `/documentos` | Receber documento |
| `GET` | `/documentos/:codigoPedido` | Listar documentos de um pedido |
| `POST` | `/exames` | Simular chegada de exame (imagem) |
| `GET` | `/exames/:accessionNumber` | Buscar exame por AccessionNumber |

---

## Exemplos de uso (curl)

### Cenário 1: Pedido sem exame correspondente

```bash
# 1. Criar pedido
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "CodigoPedido": 616,
    "NomePaciente": "ALEFHER MONTONI DE ALMEIDA",
    "DataNascimento": "19970601",
    "Sexo": "M",
    "CodUnidade": 104,
    "Exames": [
      {
        "CodigoItemPedido": 930,
        "AccessionNumber": "930",
        "Modalidade": "CR",
        "NomeProcedimento": "RX ANTEBRACO ESQUERDO"
      }
    ]
  }'
# → integrado: false
```

### Cenário 2: Pedido com exame já existente

```bash
# 1. Criar exame primeiro
curl -X POST http://localhost:3000/exames \
  -H "Content-Type: application/json" \
  -d '{
    "AccessionNumber": "930",
    "NomePaciente": "ALEFHER MONTONI DE ALMEIDA",
    "Modalidade": "CR",
    "Status": "NOVO"
  }'

# 2. Criar pedido — será marcado integrado=true automaticamente
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "CodigoPedido": 617,
    "NomePaciente": "ALEFHER MONTONI DE ALMEIDA",
    "DataNascimento": "19970601",
    "Sexo": "M",
    "CodUnidade": 104,
    "Exames": [
      {
        "CodigoItemPedido": 930,
        "AccessionNumber": "930",
        "Modalidade": "CR",
        "NomeProcedimento": "RX ANTEBRACO ESQUERDO"
      }
    ]
  }'
# → integrado: true
```

### Cenário 3 + 4: Documento pendente, depois chega exame

```bash
# 1. Criar pedido (sem exame → não integrado)
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "CodigoPedido": 615,
    "NomePaciente": "PACIENTE TESTE",
    "DataNascimento": "19900101",
    "Sexo": "F",
    "CodUnidade": 100,
    "Exames": [{"CodigoItemPedido": 800, "AccessionNumber": "800", "Modalidade": "MR", "NomeProcedimento": "RESSONANCIA CRANIO"}]
  }'

# 2. Enviar documento (pedido ainda não integrado)
curl -X POST http://localhost:3000/documentos \
  -H "Content-Type: application/json" \
  -d '{"CodigoDocumento": 251, "CodigoPedido": 615, "NomeDocumento": "PEDIDO", "Documento": "base64aqui"}'
# → documento integrado: false

# 3. Chegada do exame
curl -X POST http://localhost:3000/exames \
  -H "Content-Type: application/json" \
  -d '{"AccessionNumber": "800", "NomePaciente": "PACIENTE TESTE", "Modalidade": "MR", "Status": "NOVO"}'
# → pedido passa a integrado: true, documento vinculado ao exame

# 4. Verificar
curl http://localhost:3000/documentos/615
# → examesVinculados: ["800"], integrado: true
```

### Cenário 5: Pedido com exame novo

```bash
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "CodigoPedido": 616,
    "NomePaciente": "ALEFHER MONTONI DE ALMEIDA",
    "DataNascimento": "19970601",
    "Sexo": "M",
    "CodUnidade": 104,
    "Exames": [
      {"CodigoItemPedido": 930, "AccessionNumber": "930", "Modalidade": "CR", "NomeProcedimento": "RX ANTEBRACO"},
      {"CodigoItemPedido": 931, "AccessionNumber": "931", "Modalidade": "CR", "NomeProcedimento": "RX TORAX"}
    ]
  }'
# → exame 930 já existia; apenas exame 931 é adicionado
```

### Cenário 6: Documento duplicado

```bash
curl -X POST http://localhost:3000/documentos \
  -H "Content-Type: application/json" \
  -d '{"CodigoDocumento": 251, "CodigoPedido": 615, "NomeDocumento": "PEDIDO", "Documento": "base64"}'
# → HTTP 409 Conflict
```

---

## Estrutura do projeto

```
src/
├── main.ts                          # Bootstrap, pipes globais, logger
├── app.module.ts                    # Módulo raiz (TypeORM, Winston, imports)
├── common/
│   └── filters/
│       └── http-exception.filter.ts # Tratamento centralizado de erros
├── pedidos/
│   ├── dto/create-pedido.dto.ts
│   ├── entities/
│   │   ├── pedido.entity.ts
│   │   └── exame-item-pedido.entity.ts
│   ├── pedidos.controller.ts
│   ├── pedidos.service.ts
│   ├── pedidos.service.spec.ts      # Testes unitários
│   └── pedidos.module.ts
├── documentos/
│   ├── dto/create-documento.dto.ts
│   ├── entities/documento.entity.ts
│   ├── documentos.controller.ts
│   ├── documentos.service.ts
│   ├── documentos.service.spec.ts
│   └── documentos.module.ts
└── exames/
    ├── dto/create-exame.dto.ts
    ├── entities/exame.entity.ts
    ├── exames.controller.ts
    ├── exames.service.ts
    ├── exames.service.spec.ts
    └── exames.module.ts
```

---

