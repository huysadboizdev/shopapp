import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  FlatList,
} from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { isAdmin, user, setUser } = useAuthStore();
  const [userData, setUserData] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchUserData();
    fetchProducts();
    requestPermission();
  }, []);

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

  const renderProduct = ({ item }) => {
    console.log('Rendering product:', item);
    return (
      <TouchableOpacity style={styles.productCard}>
        <Image
          source={{ uri: item.image }}
          style={styles.productImage}
          resizeMode="cover"
          onError={(e) => console.log('Image loading error for product:', item.name, e.nativeEvent.error)}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.productDetails}>
            <Text style={styles.productDetail}>Size: {item.size.join(', ')}</Text>
            <Text style={styles.productDetail}>Color: {item.color}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
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

      {/* Products List */}
      <ScrollView style={styles.productsContainer}>
        <Text style={styles.sectionTitle}>Sản phẩm</Text>
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
        />
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
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
});
