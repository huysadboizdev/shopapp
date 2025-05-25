import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';
import * as ImagePicker from 'expo-image-picker';

export default function ManagerProduct() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    category: '',
    name: '',
    color: '',
    size: '',
    description: '',
    price: '',
    image: null,
    imageLink: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://192.168.19.104:4000/api/admin/list', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.data.success) {
        setProducts(response.data.products);
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể lấy danh sách sản phẩm');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Lỗi', 'Không thể lấy danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      category: product.category,
      name: product.name,
      color: product.color,
      size: product.size.join(', '),
      description: product.description,
      price: product.price.toString(),
      image: product.image,
      imageLink: product.imageLink,
    });
    setModalVisible(true);
  };

  const handleDelete = async (productId) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa sản phẩm này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await axios.post(
                'http://192.168.19.104:4000/api/admin/delete',
                { productId },
                {
                  headers: {
                    Authorization: `Bearer ${user.token}`
                  }
                }
              );

              if (response.data.success) {
                Alert.alert('Thành công', 'Đã xóa sản phẩm thành công');
                fetchProducts();
              } else {
                Alert.alert('Lỗi', response.data.message || 'Không thể xóa sản phẩm');
              }
            } catch (error) {
              console.error('Error deleting product:', error.response?.data || error);
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, image: result.assets[0].uri });
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.category || !formData.name || !formData.color || 
          !formData.size || !formData.description || !formData.price) {
        Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
        return;
      }

      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'size') {
          formDataToSend.append(key, formData[key].split(',').map(s => s.trim()));
        } else if (key === 'image' && formData[key]?.startsWith('file://')) {
          formDataToSend.append(key, {
            uri: formData[key],
            type: 'image/jpeg',
            name: 'product.jpg',
          });
        } else if (key === 'imageLink' && formData[key]) {
          formDataToSend.append('imageLink', formData[key]);
        } else if (key !== 'imageLink') {
          formDataToSend.append(key, formData[key]);
        }
      });

      if (editingProduct) {
        formDataToSend.append('productId', editingProduct._id);
      }

      const response = await axios.post(
        `http://192.168.19.104:4000/api/admin/${editingProduct ? 'edit' : 'add'}`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.data.success) {
        Alert.alert('Thành công', `Sản phẩm đã được ${editingProduct ? 'cập nhật' : 'thêm'} thành công`);
        setModalVisible(false);
        fetchProducts();
      } else {
        Alert.alert('Lỗi', response.data.message || 'Thao tác thất bại');
      }
    } catch (error) {
      console.error('Error submitting product:', error);
      Alert.alert('Lỗi', `Không thể ${editingProduct ? 'cập nhật' : 'thêm'} sản phẩm`);
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
        <Text style={styles.productDetail}>Danh mục: {item.category}</Text>
        <Text style={styles.productDetail}>Màu: {item.color}</Text>
        <Text style={styles.productDetail}>Size: {item.size.join(', ')}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item._id)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý sản phẩm</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingProduct(null);
            setFormData({
              category: '',
              name: '',
              color: '',
              size: '',
              description: '',
              price: '',
              image: null,
              imageLink: '',
            });
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Danh mục"
              value={formData.category}
              onChangeText={(text) => setFormData({ ...formData, category: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Tên sản phẩm"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Màu sắc"
              value={formData.color}
              onChangeText={(text) => setFormData({ ...formData, color: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Size (phân cách bằng dấu phẩy)"
              value={formData.size}
              onChangeText={(text) => setFormData({ ...formData, size: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Mô tả"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Giá"
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              keyboardType="numeric"
            />

            <View style={styles.imageSection}>
              <Text style={styles.sectionTitle}>Thêm ảnh sản phẩm</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Nhập link ảnh"
                value={formData.imageLink}
                onChangeText={(text) => setFormData({ ...formData, imageLink: text })}
              />

              <Text style={styles.orText}>Hoặc</Text>

              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Text style={styles.imageButtonText}>
                  {formData.image ? 'Thay đổi ảnh từ thiết bị' : 'Chọn ảnh từ thiết bị'}
                </Text>
              </TouchableOpacity>

              {formData.image && (
                <View style={styles.imagePreview}>
                  <Text style={styles.previewText}>Đã chọn ảnh từ thiết bị</Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>
                  {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 6,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#FF5252',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
    fontSize: 14,
  },
  imageButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  orText: {
    textAlign: 'center',
    marginVertical: 8,
    color: '#666',
    fontSize: 12,
  },
  imagePreview: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  previewText: {
    color: '#666',
    textAlign: 'center',
  },
});
