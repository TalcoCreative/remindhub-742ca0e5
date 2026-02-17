# RemindHub - Omnichannel CRM

RemindHub is a comprehensive CRM and Omnichannel Messaging platform designed to streamline customer interactions and lead management. It integrates seamlessly with Qontak for WhatsApp communication and provides a unified inbox for managing conversations from multiple channels.

## Key Features

*   **Omnichannel Inbox**: Unified inbox for WhatsApp (via Qontak) and other channels.
    *   **Hybrid Mode**: Automatically switches between Live API and Database Sync for robust message handling.
    *   **Proxy Support**: Direct API integration for sending and receiving messages.
*   **Lead Management**: Track and manage leads with a Kanban-style board.
*   **Contact Management**: Centralized contact database.
*   **Broadcasts**: Manage and track broadcast campaigns.
*   **Analytics**: Detailed dashboard with real-time metrics and charts.
*   **Premium UI**: Modern, glassmorphism-inspired design with dark mode support.

## Tech Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
*   **Backend**: Supabase (Database, Auth, Edge Functions, Realtime)
*   **Integration**: Qontak Omnichannel API

## Getting Started

For detailed documentation, please refer to the `docs/` directory:

*   [**Setup Guide**](./docs/SETUP.md): Instructions for setting up the development environment.
*   [**Architecture Overview**](./docs/ARCHITECTURE.md): Deep dive into the system architecture.
*   [**Qontak Integration**](./docs/INTEGRASI_QONTAK.md): How to configure WhatsApp integration.
*   [**Deployment**](./docs/DEPLOYMENT.md): Build and deployment guide.

## Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## Project Structure

```
remindhub/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and helpers
│   ├── pages/          # Application routes/pages
│   └── integrations/   # Supabase and Qontak clients
├── supabase/
│   ├── functions/      # Edge Functions (deno)
│   └── migrations/     # Database schema migrations
├── docs/               # Project documentation
└── public/             # Static assets
```

## License

Private Property of RemindHub. All Rights Reserved.
