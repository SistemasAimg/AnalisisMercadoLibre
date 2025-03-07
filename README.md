# MercadoAnalytics

A powerful analytics tool for MercadoLibre that provides market insights, product analysis, and trend tracking.

## Features

- Product search and filtering
- Market analysis and insights
- Trend tracking
- Category-based browsing
- Webhook integration for real-time updates
- Authentication with MercadoLibre

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- A MercadoLibre Developer account

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_ML_CLIENT_ID=your_client_id
VITE_ML_CLIENT_SECRET=your_client_secret
VITE_ML_REDIRECT_URI=your_redirect_uri
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mercado-analytics.git
cd mercado-analytics
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

5. Start the production server:
```bash
npm start
```

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── components/     # React components
├── pages/         # Page components
├── services/      # API services
├── utils/         # Utility functions
├── types/         # TypeScript type definitions
└── mocks/         # Mock data for testing
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [MercadoLibre API](https://developers.mercadolibre.com.ar/es_ar/api-docs-es)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)