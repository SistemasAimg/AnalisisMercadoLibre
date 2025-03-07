import { setupServer } from 'msw/node';
import { rest, RestRequest, ResponseComposition, RestContext } from 'msw';

export const handlers = [
  // Mock MercadoLibre API endpoints
  rest.get('https://api.mercadolibre.com/sites/MLA/categories', (
    req: RestRequest,
    res: ResponseComposition,
    ctx: RestContext
  ) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 'MLA1051', name: 'Celulares y Smartphones' },
        { id: 'MLA1648', name: 'Computación' }
      ])
    );
  }),

  rest.get('https://api.mercadolibre.com/trends/MLA', (
    req: RestRequest,
    res: ResponseComposition,
    ctx: RestContext
  ) => {
    return res(
      ctx.status(200),
      ctx.json([
        { keyword: 'iphone', url: 'https://mercadolibre.com.ar/iphone' },
        { keyword: 'samsung', url: 'https://mercadolibre.com.ar/samsung' }
      ])
    );
  }),

  rest.get('https://api.mercadolibre.com/sites/MLA/search', (
    req: RestRequest,
    res: ResponseComposition,
    ctx: RestContext
  ) => {
    return res(
      ctx.status(200),
      ctx.json({
        results: [
          {
            id: 'MLA123456789',
            title: 'iPhone 13 Pro Max',
            price: 999.99,
            currency_id: 'USD',
            available_quantity: 10,
            sold_quantity: 5,
            thumbnail: 'https://example.com/iphone.jpg',
            condition: 'new',
            permalink: 'https://mercadolibre.com.ar/iphone-13-pro-max'
          }
        ],
        paging: {
          total: 1,
          offset: 0,
          limit: 50
        }
      })
    );
  }),

  // Mock auth endpoints
  rest.post('/api/auth/token', (
    req: RestRequest,
    res: ResponseComposition,
    ctx: RestContext
  ) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh_token',
        scope: 'read write'
      })
    );
  }),

  rest.post('/api/auth/refresh', (
    req: RestRequest,
    res: ResponseComposition,
    ctx: RestContext
  ) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'new_mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new_mock_refresh_token',
        scope: 'read write'
      })
    );
  })
];

export const server = setupServer(...handlers); 