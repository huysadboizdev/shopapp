import { create } from 'zustand';

export const useCartStore = create((set) => ({
  cart: { items: [], totalAmount: 0 },
  setCart: (cart) => set({ cart }),
  addToCart: (newItem) => set((state) => {
    const existingItemIndex = state.cart.items.findIndex(
      item => item.productId._id === newItem.productId._id
    );

    let updatedItems;
    if (existingItemIndex >= 0) {
      updatedItems = [...state.cart.items];
      updatedItems[existingItemIndex].quantity += newItem.quantity;
    } else {
      updatedItems = [...state.cart.items, newItem];
    }

    const totalAmount = updatedItems.reduce(
      (total, item) => total + (item.productId.price * item.quantity),
      0
    );

    return {
      cart: {
        items: updatedItems,
        totalAmount
      }
    };
  }),
  removeFromCart: (productId) => set((state) => {
    const updatedItems = state.cart.items.filter(
      item => item.productId._id !== productId
    );

    const totalAmount = updatedItems.reduce(
      (total, item) => total + (item.productId.price * item.quantity),
      0
    );

    return {
      cart: {
        items: updatedItems,
        totalAmount
      }
    };
  }),
  updateCartItemQuantity: (productId, quantity) => set((state) => {
    const updatedItems = state.cart.items.map(item => {
      if (item.productId._id === productId) {
        return { ...item, quantity };
      }
      return item;
    });

    const totalAmount = updatedItems.reduce(
      (total, item) => total + (item.productId.price * item.quantity),
      0
    );

    return {
      cart: {
        items: updatedItems,
        totalAmount
      }
    };
  }),
  clearCart: () => set({ cart: { items: [], totalAmount: 0 } })
})); 