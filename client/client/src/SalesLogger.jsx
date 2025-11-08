import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useSession } from './SessionProvider';

export default function SalesLogger() {
  const { session } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [selectedProduct, setSelectedProduct] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]); // Defaults to today
  const [quantity, setQuantity] = useState('');

  // 1. Fetch the user's products to populate the dropdown
  useEffect(() => {
    const getProducts = async () => {
      try {
        const { user } = session;
        let { data, error } = await supabase
          .from('products')
          .select('product_id, name')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (error) throw error;
        if (data) {
          setProducts(data);
          if (data.length > 0) {
            setSelectedProduct(data[0].product_id); // Default to the first product
          }
        }
      } catch (error) {
        alert(error.error_description || error.message);
      }
    };

    getProducts();
  }, [session]);

  // 2. Handle the "Log Sale" form submission
  const handleLogSale = async (e) => {
    e.preventDefault();

    if (!selectedProduct || !saleDate || !quantity) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      setLoading(true);
      const { user } = session;
      const { error } = await supabase
        .from('sales')
        .insert({
          product_id: selectedProduct,
          user_id: user.id,
          sale_date: saleDate,
          quantity: parseInt(quantity, 10), // Ensure quantity is a number
        });

      if (error) throw error;

      alert('Sale logged successfully!');
      // Clear the form
      setQuantity('');
      setSaleDate(new Date().toISOString().split('T')[0]);

    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sales-logger-widget">
      <h3>Log New Sale</h3>
      <form onSubmit={handleLogSale}>
        <div>
          <label htmlFor="productSelect">Product</label>
          <select
            id="productSelect"
            className="inputField"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            {products.map((product) => (
              <option key={product.product_id} value={product.product_id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="saleDate">Date of Sale</label>
          <input
            id="saleDate"
            className="inputField"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="saleQuantity">Quantity Sold</label>
          <input
            id="saleQuantity"
            className="inputField"
            type="number"
            min="1"
            placeholder="e.g., 10"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <button className="button" disabled={loading}>
          {loading ? 'Logging...' : 'Log Sale'}
        </button>
      </form>
    </div>
  );
}