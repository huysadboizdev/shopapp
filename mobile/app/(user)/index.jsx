import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../store/cartStore';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { isAdmin, user, setUser } = useAuthStore();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const { addToCart: addToCartStore } = useCartStore();

  const categories = [
    { id: 'all', name: 'Tất cả' },
    { id: 'ao', name: 'Áo', keywords: ['áo', 'shirt', 't-shirt', 'sơ mi'] },
    { id: 'quan', name: 'Quần', keywords: ['quần', 'pants', 'jeans', 'shorts'] },
    { id: 'vo', name: 'Vớ', keywords: ['vớ', 'socks'] },
    { id: 'tat', name: 'Tất', keywords: ['tất', 'stockings'] },
    { id: 'mu', name: 'Mũ', keywords: ['mũ', 'nón', 'hat', 'cap', 'nón lưỡi trai', 'mũ lưỡi trai'] },
  ];

  // Debounce search function
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const filterProducts = useCallback(() => {
    setIsSearching(true);
    try {
      let filtered = [...products];
      const query = searchQuery.toLowerCase().trim();
      
      // Filter by category
      if (selectedCategory !== 'all') {
        const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
        if (selectedCategoryData) {
          filtered = filtered.filter(product => {
            const productName = product.name.toLowerCase();
            const productDesc = product.description.toLowerCase();
            
            // Kiểm tra xem sản phẩm có chứa bất kỳ từ khóa nào của danh mục không
            const hasCategoryKeyword = selectedCategoryData.keywords.some(keyword => {
              const normalizedKeyword = keyword.toLowerCase();
              return productName.includes(normalizedKeyword) || 
                     productDesc.includes(normalizedKeyword);
            });

            // Nếu đang tìm kiếm, kiểm tra thêm từ khóa tìm kiếm
            if (query) {
              return hasCategoryKeyword && (
                productName.includes(query) ||
                productDesc.includes(query) ||
                product.price.toString().includes(query)
              );
            }

            return hasCategoryKeyword;
          });
        }
      } else if (query) {
        // Nếu không có danh mục được chọn, chỉ tìm kiếm theo từ khóa
        filtered = filtered.filter(product => {
          const productName = product.name.toLowerCase();
          const productDesc = product.description.toLowerCase();
          const productPrice = product.price.toString();
          
          return (
            productName.includes(query) ||
            productDesc.includes(query) ||
            productPrice.includes(query)
          );
        });
      }
      
      setFilteredProducts(filtered);
    } catch (error) {
      console.error('Error filtering products:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tìm kiếm sản phẩm');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedCategory, products]);

  // Debounced filter function
  const debouncedFilter = useCallback(
    debounce(() => {
      filterProducts();
    }, 300),
    [filterProducts]
  );

  useEffect(() => {
    fetchUserData();
    fetchProducts();
    requestPermission();
  }, []);

  useEffect(() => {
    debouncedFilter();
  }, [searchQuery, selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...');
      const response = await axios.get('http://192.168.19.104:4000/api/user/products', {
        headers: {
          token: user.token
        }
      });
      
      if (response.data.success) {
        console.log('API Response:', response.data);
        console.log('Products array:', response.data.products);
        if (response.data.products && response.data.products.length > 0) {
          console.log('First product image URL:', response.data.products[0].image);
        }
        setProducts(response.data.products);
      } else {
        console.log('API returned success: false');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to fetch products');
    }
  };

  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Sorry, we need camera roll permissions to make this work!');
      }
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await axios.get('http://192.168.19.104:4000/api/user/get-user', {
        headers: {
          token: user.token
        }
      });
      
      if (response.data.success) {
        setUserData(response.data.user);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch user data');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri) => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });
      formData.append('userId', userData._id);

      const response = await axios.put(
        'http://192.168.19.104:4000/api/user/update-profile',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            token: user.token,
          },
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Profile image updated');
        fetchUserData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile image');
    }
  };

  const addToCart = async (item) => {
    try {
      if (!item || !item._id) {
        Alert.alert('Lỗi', 'Thông tin sản phẩm không hợp lệ');
        return;
      }

      console.log('Adding to cart:', {
        productId: item._id,
        quantity: 1,
        token: user.token
      });

      const cartItem = {
        productId: item,
        quantity: 1
      };

      // Cập nhật UI ngay lập tức
      addToCartStore(cartItem);

      const response = await axios.post(
        'http://192.168.19.104:4000/api/user/add_cart',
        {
          productId: item._id,
          quantity: 1
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'token': user.token
          }
        }
      );

      console.log('Add to cart response:', response.data);

      if (response.data.success) {
        Alert.alert(
          'Thành công',
          'Đã thêm sản phẩm vào giỏ hàng',
          [
            {
              text: 'Xem giỏ hàng',
              onPress: () => router.push('/cart')
            },
            {
              text: 'Tiếp tục mua sắm',
              style: 'cancel'
            }
          ]
        );
      } else {
        // Nếu API call thất bại, rollback cart state
        Alert.alert('Lỗi', response.data.message || 'Không thể thêm vào giỏ hàng');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        Alert.alert(
          'Lỗi',
          error.response.data.message || 'Không thể thêm vào giỏ hàng'
        );
      } else if (error.request) {
        console.error('Error request:', error.request);
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ');
      } else {
        console.error('Error message:', error.message);
        Alert.alert('Lỗi', 'Có lỗi xảy ra khi thêm vào giỏ hàng');
      }
    }
  };

  const clearCart = async () => {
    try {
      Alert.alert(
        'Xác nhận',
        'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
        [
          {
            text: 'Hủy',
            style: 'cancel'
          },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await axios.delete(
                  'http://192.168.19.104:4000/api/user/clear_cart',
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      'token': user.token
                    }
                  }
                );

                if (response.data.success) {
                  Alert.alert('Thành công', 'Đã xóa toàn bộ giỏ hàng');
                } else {
                  Alert.alert('Lỗi', response.data.message || 'Không thể xóa giỏ hàng');
                }
              } catch (error) {
                console.error('Error clearing cart:', error);
                Alert.alert('Lỗi', 'Không thể xóa giỏ hàng');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in clear cart:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi xóa giỏ hàng');
    }
  };

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Chào Mừng</Text>
            <Text style={styles.username}>{userData?.name}</Text>
            <Text style={styles.shopName}> Đến Với Mạnh Shop</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
              <Image
                source={
                  userData?.image
                    ? { uri: userData.image }
                    : require('../../assets/images/shop1.png')
                }
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search and Categories */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm sản phẩm..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && styles.categoryButtonTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products List */}
      <ScrollView style={styles.productsContainer}>
        <Text style={styles.sectionTitle}>Sản phẩm</Text>
        <View style={styles.productGrid}>
          {filteredProducts.map((item) => (
            <View key={item._id} style={styles.productColumn}>
              <TouchableOpacity 
                style={styles.productCard}
                onPress={() => router.push('ProductDetail', { product: item })}
              >
                <Image
                  source={{ uri: item.image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>
                    {item.price ? item.price.toLocaleString('vi-VN') + 'đ' : '0đ'}
                  </Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.productDetails}>
                    <Text style={styles.productDetail}>
                      Size: {Array.isArray(item.size) ? item.size.join(', ') : item.size}
                    </Text>
                    <Text style={styles.productDetail}>
                      Color: {item.color}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.addToCartButton}
                    onPress={() => addToCart(item)}
                  >
                    <Text style={styles.addToCartButtonText}>Thêm vào giỏ</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  shopName: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  avatarContainer: {
    marginLeft: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  productsContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  productColumn: {
    width: '48%',
    marginBottom: 15,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  productInfo: {
    padding: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productDetail: {
    fontSize: 12,
    color: '#999',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoryButtonText: {
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  addToCartButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
