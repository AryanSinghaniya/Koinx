# KoinX Reconciliation Engine

This project is a Transaction Reconciliation Engine built in Node.js as part of the KoinX backend take-home assignment. It ingests transaction data from two different sources (user and exchange), matches them, and generates a reconciliation report.

## Project Structure

```
.
├── src
│   ├── api
│   │   ├── controllers
│   │   │   └── reconciliationController.js
│   │   └── routes
│   │       └── reconciliationRoutes.js
│   ├── config
│   │   └── config.js
│   ├── models
│   │   ├── ReconciliationReport.js
│   │   └── Transaction.js
│   └── services
│       ├── ingestion.js
│       └── reconciliation.js
├── .env
├── .gitignore
├── app.js
├── package.json
└── README.md
```

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following variables:
    ```
    MONGO_URI=mongodb://localhost:27017/koinx
    TIMESTAMP_TOLERANCE_SECONDS=300
    QUANTITY_TOLERANCE_PCT=0.0001
    ```
    Make sure you have a MongoDB instance running.

4.  **Place CSV files:**
    Place the `user_transactions.csv` and `exchange_transactions.csv` files in a location accessible by the application. The paths are currently hardcoded in `src/api/controllers/reconciliationController.js`. You can modify the paths as needed.

5.  **Start the server:**
    To start the server in development mode (with auto-reloading):
    ```bash
    npm run dev
    ```
    To start the server in production mode:
    ```bash
    npm start
    ```
    The server will be running on `http://localhost:5000`.

## API Endpoints

| Method | Endpoint                  | Description                                                              |
| ------ | ------------------------- | ------------------------------------------------------------------------ |
| `POST` | `/api/reconcile`          | Trigger a new reconciliation run.                                        |
| `GET`  | `/api/report/:runId`      | Fetch the full reconciliation report for a specific run.                 |
| `GET`  | `/api/report/:runId/summary` | Fetch a summary of the reconciliation report (counts of matched, etc.). |
| `GET`  | `/api/report/:runId/unmatched` | Fetch only the unmatched transactions from a report.                     |

### Trigger Reconciliation

You can override the default matching tolerances by sending a JSON body with the `/api/reconcile` request:

```json
{
    "timestampTolerance": 600,
    "quantityTolerance": 0.0002
}
```

## Design Decisions

*   **Database:** MongoDB was chosen due to its flexible schema, which is well-suited for handling varied and potentially messy data from different sources. The Mongoose ODM is used to interact with the database, providing schema validation and a structured way to model application data.

*   **Data Ingestion:** The `csv-parser` library is used for streaming and parsing the CSV files. This is memory-efficient, especially for large files. Each row is validated, and any rows with missing required fields are logged to the console. They are not inserted into the database to maintain data integrity.

*   **Matching Logic:**
    *   The matching algorithm iterates through user transactions and tries to find a corresponding transaction in the exchange data.
    *   A "soft" match is first attempted based on a configurable time window, asset type, and transaction type.
    *   The transaction types `TRANSFER_IN` and `TRANSFER_OUT` are considered equivalent from opposite perspectives.
    *   If a soft match is found, the quantity is checked against a configurable tolerance.
    *   If all conditions are met, the transactions are marked as "matched".
    *   If the quantity is outside the tolerance, they are marked as "conflicting".
    *   Transactions that don't find a match are marked as "unmatched".

*   **Configuration:** Matching tolerances and the database connection string are managed through environment variables and a configuration file (`src/config/config.js`), allowing for easy changes without modifying the code.

*   **API:** A RESTful API is exposed using Express.js to trigger the reconciliation process and retrieve reports. A unique `runId` (UUID) is generated for each reconciliation run to track and fetch specific reports.

*   **Code Structure:** The code is organized into modules for clarity and maintainability:
    *   `api`: Handles HTTP requests and responses.
    *   `config`: Manages configuration.
    *   `models`: Defines database schemas.
    *   `services`: Contains the core business logic (ingestion and reconciliation).
