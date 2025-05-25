import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import RatingStars from '../../components/RatingStars';

const ManagerReview = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      let url = 'http://192.168.19.104:4000/api/admin/reviews';
      
      if (activeTab === 'product' && selectedId) {
        url = `http://192.168.19.104:4000/api/admin/product-reviews/${selectedId}`;
      } else if (activeTab === 'order' && selectedId) {
        url = `http://192.168.19.104:4000/api/admin/order-reviews/${selectedId}`;
      } else if (activeTab === 'user' && selectedId) {
        url = `http://192.168.19.104:4000/api/admin/user-reviews/${selectedId}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.data.success) {
        setReviews(response.data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Lỗi', 'Không thể lấy danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const response = await axios.get('http://192.168.19.104:4000/api/admin/review-stats', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchReviewStats();
  }, [activeTab, selectedId]);

  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa đánh giá này?',
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
              const response = await axios.delete('http://192.168.19.104:4000/api/admin/reviews', {
                data: { reviewId },
                headers: {
                  Authorization: `Bearer ${user.token}`
                }
              });

              if (response.data.success) {
                Alert.alert('Thành công', 'Đã xóa đánh giá');
                fetchReviews();
                fetchReviewStats();
              }
            } catch (error) {
              console.error('Error deleting review:', error);
              Alert.alert('Lỗi', 'Không thể xóa đánh giá');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTabButton = (title, tab) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => {
        setActiveTab(tab);
        setSelectedId(null);
      }}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const filteredReviews = reviews.filter(review => {
    const searchLower = searchQuery.toLowerCase();
    return (
      review.product?.name?.toLowerCase().includes(searchLower) ||
      review.user?.name?.toLowerCase().includes(searchLower) ||
      review.order?.orderNumber?.toLowerCase().includes(searchLower) ||
      review.comment?.toLowerCase().includes(searchLower)
    );
  });

  const renderReviewItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reviewItem}
      onPress={() => {
        setSelectedReview(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.productInfo}>
          {item.product?.image && (
            <Image 
              source={{ uri: item.product.image }} 
              style={styles.productImage}
            />
          )}
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{item.product?.name}</Text>
            <Text style={styles.orderNumber}>Đơn hàng: {item.order?.orderNumber}</Text>
          </View>
        </View>
        <Text style={styles.reviewDate}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <View style={styles.reviewContent}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user?.name}</Text>
          <RatingStars rating={item.rating} size={16} />
        </View>
        <Text style={styles.comment}>{item.comment}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteReview(item._id)}
      >
        <Ionicons name="trash-outline" size={24} color="red" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.navbar}>
            <Text style={styles.navbarTitle}>Quản Lý Đánh Giá</Text>
          </View>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loading} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.navbar}>
          <Text style={styles.navbarTitle}>Quản Lý Đánh Giá</Text>
        </View>

        <View style={styles.tabContainer}>
          {renderTabButton('Tất cả', 'all')}
          {renderTabButton('Theo sản phẩm', 'product')}
          {renderTabButton('Theo đơn hàng', 'order')}
          {renderTabButton('Theo người dùng', 'user')}
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm đánh giá..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalReviews}</Text>
              <Text style={styles.statLabel}>Tổng đánh giá</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {(stats.reviewsByRating.reduce((acc, curr) => acc + (curr._id * curr.count), 0) / 
                  stats.reviewsByRating.reduce((acc, curr) => acc + curr.count, 0)).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Đánh giá trung bình</Text>
            </View>
          </View>
        )}

        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item._id}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
          }
        />

        <Modal
          visible={showDetailModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {selectedReview && (
                <ScrollView>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chi tiết đánh giá</Text>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setShowDetailModal(false)}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.modalProductInfo}>
                    {selectedReview.product?.image && (
                      <Image 
                        source={{ uri: selectedReview.product.image }} 
                        style={styles.modalProductImage}
                      />
                    )}
                    <View style={styles.modalProductDetails}>
                      <Text style={styles.modalProductName}>
                        {selectedReview.product?.name}
                      </Text>
                      <Text style={styles.modalOrderNumber}>
                        Mã đơn hàng: {selectedReview.order?.orderNumber}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalUserInfo}>
                    <Text style={styles.modalUserName}>
                      Người đánh giá: {selectedReview.user?.name}
                    </Text>
                    <Text style={styles.modalUserEmail}>
                      Email: {selectedReview.user?.email}
                    </Text>
                  </View>
                  <View style={styles.modalRating}>
                    <Text style={styles.modalRatingLabel}>Đánh giá:</Text>
                    <RatingStars rating={selectedReview.rating} size={24} />
                  </View>
                  <Text style={styles.modalComment}>{selectedReview.comment}</Text>
                  <Text style={styles.modalDate}>
                    Ngày đánh giá: {formatDate(selectedReview.createdAt)}
                  </Text>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -40,
  },
  navbar: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    height: 190,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  navbarTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f8f8f8',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    color: '#666',
    fontSize: 14,
  },
  activeTabButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  listContent: {
    padding: 15,
  },
  reviewItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  reviewContent: {
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  comment: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  deleteButton: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 15,
  },
  modalProductDetails: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalOrderNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalUserInfo: {
    marginBottom: 15,
  },
  modalUserName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  modalUserEmail: {
    fontSize: 14,
    color: '#666',
  },
  modalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalRatingLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  modalComment: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    marginBottom: 10,
  },
  modalDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
});

export default ManagerReview;
