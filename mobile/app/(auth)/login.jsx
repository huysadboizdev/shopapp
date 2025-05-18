import { View, Text, Image, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from "@expo/vector-icons";
import COLORS from '../../constants/colors';
import { Link, useRouter } from "expo-router";
import styles from "../../assets/styles/login.styles";
import { useAuthStore } from "../../store/authStore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  // Check if there is any stored login info
  useEffect(() => {
    const loadStoredData = async () => {
      const storedEmail = await AsyncStorage.getItem('email');
      const storedPassword = await AsyncStorage.getItem('password');
      if (storedEmail && storedPassword) {
        setEmail(storedEmail);
        setPassword(storedPassword);
        setRememberMe(true);
      }
    };

    loadStoredData();
  }, []);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert(
          "Thông báo",
          "Vui lòng nhập đầy đủ email và mật khẩu",
          [{ text: "OK" }]
        );
        return;
      }

      setIsLoading(true);

      // Check if admin login
      if (email === "admin@gmail.com" && password === "admin123") {
        const response = await axios.post('http://192.168.19.104:4000/api/admin/login', {
          email,
          password
        });

        if (response.data.success) {
          setUser({
            token: response.data.accesstoken,
            email: email,
            isAdmin: true
          });

          if (rememberMe) {
            await AsyncStorage.setItem('email', email);
            await AsyncStorage.setItem('password', password);
          } else {
            await AsyncStorage.removeItem('email');
            await AsyncStorage.removeItem('password');
          }

          Alert.alert(
            "Thành công",
            "Đăng nhập quản trị viên thành công!",
            [{ text: "OK" }]
          );
          router.replace('/(admin)');
          return;
        }
      }

      // If not admin, try user login
      const response = await axios.post('http://192.168.19.104:4000/api/user/login', {
        email,
        password
      });

      if (response.data.success) {
        setUser({
          token: response.data.accesstoken,
          email: email,
          isAdmin: false
        });

        // Lưu token vào AsyncStorage
        await AsyncStorage.setItem('userToken', response.data.accesstoken);

        if (rememberMe) {
          await AsyncStorage.setItem('email', email);
          await AsyncStorage.setItem('password', password);
        } else {
          await AsyncStorage.removeItem('email');
          await AsyncStorage.removeItem('password');
        }

        Alert.alert(
          "Thành công",
          "Đăng nhập thành công!",
          [{ text: "OK" }]
        );
        router.replace('/(user)');
      } else {
        Alert.alert(
          "Thông báo",
          response.data.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error);
      let errorMessage = "Có lỗi xảy ra trong quá trình đăng nhập";
      
      if (error.response?.data?.message === 'email not found') {
        errorMessage = "Email không tồn tại trong hệ thống";
      } else if (error.response?.data?.message === 'wrong password') {
        errorMessage = "Mật khẩu không chính xác";
      }

      Alert.alert(
        "Thông báo",
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.topIllustration}>
          <Image
            source={require("../../assets/images/shop1.png")}
            style={[styles.illustrationImage, { width: 200, height: 200 }]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.formContainer}>
            {/* EMAIL */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: '#333' }]}
                  placeholder="Nhập email của bạn"
                  placeholderTextColor="#555"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: '#333' }]}
                  placeholder="Nhập mật khẩu của bạn"
                  placeholderTextColor="#555"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember me checkbox */}
            <View style={styles.inputGroup}>
              <TouchableOpacity
                onPress={() => setRememberMe(!rememberMe)}
                style={styles.rememberMeContainer}
              >
                <Ionicons
                  name={rememberMe ? "checkbox" : "checkbox-outline"}
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.rememberMeText}>Lưu mật khẩu</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Chưa có tài khoản?</Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>Đăng ký</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
