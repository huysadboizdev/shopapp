import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';

const Profile = () => {
    const router = useRouter();
    const { user: authUser, setUser } = useAuthStore();
    const [user, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        console.log('Profile component mounted');
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                console.log('Stored token:', token);
                
                if (!token) {
                    router.replace('/login');
                    return;
                }
                fetchUserData();
            } catch (error) {
                console.error('Auth check error:', error);
            }
        };
        checkAuth();
    }, []);

    const fetchUserData = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                router.replace('/login');
                return;
            }

            const response = await axios.get('http://192.168.19.104:4000/api/user/get-user', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const userData = response.data.user;
                setUserData(userData);
                setUser(userData);
                setFormData({
                    name: userData.name || '',
                    phone: userData.phone || '',
                    address: userData.address || ''
                });
            }
        } catch (error) {
            console.error('Fetch user data error:', error);
            if (error.response?.status === 401) {
                setUser(null);
                router.replace('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleImagePick = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                await updateProfile({ 
                    ...formData,
                    image: result.assets[0].uri 
                });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh');
        }
    };

    const updateProfile = async (data) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            console.log('Using token for update:', token);
            
            if (!token) {
                Alert.alert('Lỗi', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                router.replace('/login');
                return;
            }

            const requestData = {
                userId: user._id,
                name: data.name,
                phone: data.phone,
                address: data.address
            };

            console.log('Sending request to server:', {
                url: 'http://192.168.19.104:4000/api/user/update-profile',
                method: 'PUT',
                data: requestData,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const response = await axios.put(
                'http://192.168.19.104:4000/api/user/update-profile',
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Server response:', response.data);

            if (response.data.success) {
                const updatedUser = {
                    ...user,
                    name: data.name,
                    phone: data.phone,
                    address: data.address
                };
                
                setUserData(updatedUser);
                setUser(updatedUser);
                
                Alert.alert('Thành công', 'Cập nhật thông tin thành công');
                setEditing(false);
                await fetchUserData();
            } else {
                console.error('Update failed:', response.data);
                Alert.alert('Lỗi', response.data.message || 'Cập nhật thông tin thất bại');
            }
        } catch (error) {
            console.error('Update Error Details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                data: error.response?.data,
                config: error.config
            });
            
            if (error.response?.status === 401) {
                setUser(null);
                router.replace('/login');
            } else {
                Alert.alert(
                    'Lỗi',
                    error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin'
                );
            }
        }
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên người dùng');
            return;
        }
        if (!user?._id) {
            Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
            return;
        }
        console.log('Saving with data:', formData);
        updateProfile(formData);
    };

    const handleLogout = async () => {
        try {
            console.log('Logging out...');
            setUser(null);
            router.replace('/login');
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Lỗi', 'Không thể đăng xuất');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Đang tải...</Text>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            {/* Navigation Bar */}
            <View style={styles.navbar}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Tài khoản</Text>
                <TouchableOpacity 
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleImagePick} style={styles.imageContainer}>
                        {user?.image ? (
                            <Image source={{ uri: user.image }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="person" size={50} color="#666" />
                            </View>
                        )}
                        <View style={styles.editIconContainer}>
                            <Ionicons name="camera" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.userName}>{user?.name || 'Chưa cập nhật'}</Text>
                </View>

                <View style={styles.infoContainer}>
                    {editing ? (
                        <>
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                placeholder="Tên người dùng"
                            />
                            <TextInput
                                style={styles.input}
                                value={formData.phone}
                                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                placeholder="Số điện thoại"
                                keyboardType="phone-pad"
                            />
                            <TextInput
                                style={styles.input}
                                value={formData.address}
                                onChangeText={(text) => setFormData({ ...formData, address: text })}
                                placeholder="Địa chỉ"
                                multiline
                            />
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.saveButton]}
                                    onPress={handleSave}
                                >
                                    <Text style={styles.buttonText}>Lưu</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={() => {
                                        setEditing(false);
                                        setFormData({
                                            name: user.name || '',
                                            phone: user.phone || '',
                                            address: user.address || ''
                                        });
                                    }}
                                >
                                    <Text style={styles.buttonText}>Hủy</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Tên:</Text>
                                    <Text style={styles.value}>{user?.name || 'Chưa cập nhật'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Email:</Text>
                                    <Text style={styles.value}>{user?.email || 'Chưa cập nhật'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Số điện thoại:</Text>
                                    <Text style={styles.value}>{user?.phone || 'Chưa cập nhật'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Địa chỉ:</Text>
                                    <Text style={styles.value}>{user?.address || 'Chưa cập nhật'}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.button, styles.editButton]}
                                onPress={() => setEditing(true)}
                            >
                                <Text style={styles.buttonText}>Chỉnh sửa thông tin</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    navbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backButton: {
        padding: 8,
    },
    navbarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    logoutButton: {
        padding: 8,
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    placeholderImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#e1e1e1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#007AFF',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
    },
    infoContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    infoRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
    },
    label: {
        flex: 1,
        fontSize: 16,
        color: '#666',
    },
    value: {
        flex: 2,
        fontSize: 16,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e1e1e1',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 10,
    },
    editButton: {
        backgroundColor: '#007AFF',
    },
    saveButton: {
        backgroundColor: '#34C759',
        flex: 1,
        marginRight: 5,
    },
    cancelButton: {
        backgroundColor: '#FF3B30',
        flex: 1,
        marginLeft: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default Profile;
