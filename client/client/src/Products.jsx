import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useSession } from './SessionProvider';

export default function Products() {
  const { session } = useSession(); // Get the user's session
  const [loading, setLoading] = useState(true);
  
  // States for the products list
  const [products, setProducts] = useState([]);
  
  // States for the new product form
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');

  // 1. Fetch all products for this user when the component loads
  useEffect(() => {
    getProducts();
  }, [session]);

  const getProducts = async () => {
    try {
      setLoading(true);
      // We know who the user is from the session
      const { user } = session;

      // Fetch products that match the user's ID
      let { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id) // RLS in Supabase also enforces this
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setProducts(data);

    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle the "Add Product" form submission
  const handleAddProduct = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const { user } = session;

      // Insert a new row into the 'products' table
      const { error } = await supabase
        .from('products')
        .insert({
          user_id: user.id, // Set the owner
          name: newProductName,
          sku: newProductSku,
        });

      if (error) throw error;

      // Clear the form and refresh the product list
      setNewProductName('');
      setNewProductSku('');
      getProducts(); // Re-fetch the list

    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-widget">
      
      {/* Part 1: New Product Form */}
      <h3>Add New Product</h3>
      <form onSubmit={handleAddProduct}>
        <div>
          <label htmlFor="productName">Product Name</label>
          <input
            id="productName"
            className="inputField"
            type="text"
            placeholder="e.g., House Blend"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="productSku">SKU (Optional)</label>
          <input
            id="productSku"
            className="inputField"
            type="text"
            placeholder="e.g., HB-001"
            value={newProductSku}
            onChange={(e) => setNewProductSku(e.target.value)}
          />
        </div>
        <button className="button" disabled={loading}>
          {loading ? 'Saving...' : 'Save Product'}
        </button>
      </form>

      <hr style={{ margin: '20px 0' }} />

      {/* Part 2: Product List */}
      <h3>Your Products</h3>
      {loading && <p>Loading products...</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.product_id}>
              <td>{product.name}</td>
              <td>{product.sku}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && !loading && <p>You haven't added any products yet.</p>}
    </div>
  );
}