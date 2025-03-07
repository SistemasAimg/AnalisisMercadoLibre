import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from '../ProductCard';
import { Product } from '../../services/api';

const mockProduct: Product = {
  id: 'MLA123456789',
  title: 'iPhone 13 Pro Max',
  price: 999.99,
  currency_id: 'USD',
  available_quantity: 10,
  sold_quantity: 5,
  thumbnail: 'https://example.com/iphone.jpg',
  condition: 'new',
  permalink: 'https://mercadolibre.com.ar/iphone-13-pro-max',
  seller: {
    id: 123456,
    nickname: 'TestSeller',
    power_seller_status: 'PLATINUM'
  },
  shipping: {
    free_shipping: true
  }
};

describe('ProductCard', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);

    // Check if product title is displayed
    expect(screen.getByText('iPhone 13 Pro Max')).toBeInTheDocument();

    // Check if price is displayed
    expect(screen.getByText('$999.99')).toBeInTheDocument();

    // Check if seller information is displayed
    expect(screen.getByText('TestSeller')).toBeInTheDocument();

    // Check if shipping information is displayed
    expect(screen.getByText('Envío gratis')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);

    // Click the product card
    fireEvent.click(screen.getByRole('button'));

    // Verify that onClick was called with the correct product
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(mockOnClick).toHaveBeenCalledWith(mockProduct);
  });

  it('displays correct condition label', () => {
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('displays correct quantity information', () => {
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);
    expect(screen.getByText('10 disponibles')).toBeInTheDocument();
    expect(screen.getByText('5 vendidos')).toBeInTheDocument();
  });
}); 