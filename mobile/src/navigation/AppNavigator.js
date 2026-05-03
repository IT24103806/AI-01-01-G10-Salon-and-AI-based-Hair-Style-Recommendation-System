import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import ServicesScreen from "../screens/customer/ServicesScreen";
import ProductsScreen from "../screens/customer/ProductsScreen";
import OffersScreen from "../screens/customer/OffersScreen";
import ProductCheckoutScreen from "../screens/customer/ProductCheckoutScreen";
import BookAppointmentScreen from "../screens/customer/BookAppointmentScreen";
import MyAppointmentsScreen from "../screens/customer/MyAppointmentsScreen";
import RescheduleAppointmentScreen from "../screens/customer/RescheduleAppointmentScreen";
import PaymentScreen from "../screens/customer/PaymentScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import ManageServicesScreen from "../screens/admin/ManageServicesScreen";
import ManageStaffScreen from "../screens/admin/ManageStaffScreen";
import ManageUsersScreen from "../screens/admin/ManageUsersScreen";
import ManageInventoryScreen from "../screens/admin/ManageInventoryScreen";
import ManageBeauticianInventoryScreen from "../screens/admin/ManageBeauticianInventoryScreen";
import AdminAppointmentsScreen from "../screens/admin/AdminAppointmentsScreen";
import BeauticianAppointmentHistoryScreen from "../screens/admin/BeauticianAppointmentHistoryScreen";
import BeauticianInventoryScreen from "../screens/admin/BeauticianInventoryScreen";
import ProfileScreen from "../screens/common/ProfileScreen";
import FeedbackScreen from "../screens/common/FeedbackScreen";
import TermsConditionsScreen from "../screens/common/TermsConditionsScreen";
import { useTheme } from "../context/ThemeContext";
import LoadingState from "../components/LoadingState";
import { FONTS, LAYOUT, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const SIDEBAR_WIDTH = LAYOUT.sidebarWidth;
const TOPIC_HEADER_SAFE_TOP = 22;
const TOPIC_HEADER_MIN_HEIGHT = 84;
const ADMIN_SECTIONS = [
  { key: "Dashboard", label: "Dashboard", icon: "grid-outline" },
  { key: "Services", label: "Services", icon: "cut-outline" },
  { key: "Inventory", label: "Inventory", icon: "cube-outline" },
  { key: "BeauticianInventory", label: "Beautician Inventory", icon: "pricetag-outline" },
  { key: "Staff", label: "Beautician", icon: "people-outline" },
  { key: "Users", label: "Users", icon: "people-circle-outline" },
  { key: "Appointments", label: "Appointments", icon: "calendar-outline" },
  { key: "Feedbacks", label: "Feedbacks", icon: "chatbubbles-outline" },
  { key: "Payments", label: "Payments", icon: "card-outline" }
];
const STAFF_SECTIONS = [
  { key: "Appointments", label: "Appointments", icon: "calendar-outline" },
  { key: "Inventory", label: "Inventory", icon: "cube-outline" },
  { key: "Payments", label: "Payments", icon: "card-outline" },
  { key: "AppointmentHistory", label: "Appointment History", icon: "time-outline" },
  { key: "Feedbacks", label: "Feedbacks", icon: "chatbubbles-outline" },
  { key: "Profile", label: "Profile", icon: "person-outline" }
];

const getTabIconName = (routeName, focused) => {
  const iconMap = {
    Dashboard: focused ? "grid" : "grid-outline",
    Services: focused ? "cut" : "cut-outline",
    Products: focused ? "bag-handle" : "bag-handle-outline",
    Inventory: focused ? "cube" : "cube-outline",
    Staff: focused ? "people" : "people-outline",
    Appointments: focused ? "calendar" : "calendar-outline",
    Feedbacks: focused ? "chatbubbles" : "chatbubbles-outline",
    Payments: focused ? "card" : "card-outline",
    Profile: focused ? "person" : "person-outline"
  };

  return iconMap[routeName] || (focused ? "ellipse" : "ellipse-outline");
};

function AuthStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text, fontFamily: FONTS.heading, fontSize: TYPOGRAPHY.display },
        headerTitleAlign: "left",
        headerTintColor: colors.text,
        headerBackTitleVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right"
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Register" }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Forgot Password" }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: "Reset Password" }} />
    </Stack.Navigator>
  );
}

function CustomerStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text, fontFamily: FONTS.heading, fontSize: TYPOGRAPHY.display },
        headerTitleAlign: "left",
        headerTintColor: colors.text,
        headerBackTitleVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right"
      }}
    >
      <Stack.Screen
        name="Services"
        component={ServicesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Products" component={ProductsScreen} options={{ title: "Products" }} />
      <Stack.Screen name="ProductCheckout" component={ProductCheckoutScreen} options={{ title: "Checkout" }} />
      <Stack.Screen name="Appointments" component={MyAppointmentsScreen} options={{ title: "My Appointments" }} />
      <Stack.Screen
        name="RescheduleAppointment"
        component={RescheduleAppointmentScreen}
        options={{ title: "Reschedule Appointment" }}
      />
      <Stack.Screen name="Offers" component={OffersScreen} options={{ title: "Everyday Value Offers" }} />
      <Stack.Screen name="Feedbacks" component={FeedbackScreen} options={{ title: "Feedbacks" }} />
      <Stack.Screen name="Payments" component={PaymentScreen} options={{ title: "Payments" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} options={{ title: "Terms & Conditions" }} />
      <Stack.Screen
        name="BookAppointment"
        component={BookAppointmentScreen}
        options={{ title: "Book Appointment" }}
      />
    </Stack.Navigator>
  );
}

function AdminShell() {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWideLayout = width >= 900;
  const styles = createAdminStyles(colors, isWideLayout);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const drawerOpacity = useRef(new Animated.Value(0)).current;

  const adminComponents = {
    Dashboard: AdminDashboardScreen,
    Services: ManageServicesScreen,
    Inventory: ManageInventoryScreen,
    BeauticianInventory: ManageBeauticianInventoryScreen,
    Staff: ManageStaffScreen,
    Users: ManageUsersScreen,
    Appointments: AdminAppointmentsScreen,
    Feedbacks: FeedbackScreen,
    Payments: PaymentScreen,
    Profile: ProfileScreen
  };

  const activeMeta = ADMIN_SECTIONS.find((item) => item.key === activeSection) || { label: activeSection };
  const ActiveComponent = adminComponents[activeSection] || AdminDashboardScreen;

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: -SIDEBAR_WIDTH,
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(drawerOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      })
    ]).start(() => setDrawerVisible(false));
  }, [drawerOpacity, drawerTranslateX]);

  const openDrawer = useCallback(() => {
    drawerTranslateX.setValue(-SIDEBAR_WIDTH);
    drawerOpacity.setValue(0);
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true
      }),
      Animated.timing(drawerOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true
      })
    ]).start();
  }, [drawerOpacity, drawerTranslateX]);

  const navigationProxy = useMemo(
    () => ({
      navigate: (routeName) => {
        if (adminComponents[routeName]) {
          setActiveSection(routeName);
        }
      },
      openSidebar: () => {
        if (!isWideLayout) openDrawer();
      }
    }),
    [isWideLayout, openDrawer]
  );

  const edgeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gestureState) =>
          !isWideLayout &&
          !drawerVisible &&
          evt?.nativeEvent?.pageX <= 24 &&
          gestureState.dx > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 36) openDrawer();
        }
      }),
    [drawerVisible, isWideLayout, openDrawer]
  );

  const drawerSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          drawerVisible &&
          gestureState.dx < -8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -40) closeDrawer();
        }
      }),
    [closeDrawer, drawerVisible]
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          if (drawerVisible) closeDrawer();
          await logout();
        }
      }
    ]);
  };

  const renderSidebar = ({ mobile = false } = {}) => (
    <View style={[styles.sidebar, mobile && styles.mobileSidebar]}>
      <Text style={styles.sidebarTitle}>Admin Panel</Text>
      <Text style={styles.sidebarSubtitle}>Salon Management</Text>
      <View style={styles.sidebarProfileCard}>
        {user?.profileImage ? (
          <Pressable
            style={styles.sidebarAvatarWrap}
            onPress={() => {
              setActiveSection("Profile");
              if (mobile) closeDrawer();
            }}
          >
            <Animated.Image source={{ uri: user.profileImage }} style={styles.sidebarAvatar} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.sidebarAvatarFallback}
            onPress={() => {
              setActiveSection("Profile");
              if (mobile) closeDrawer();
            }}
          >
            <Ionicons name="person-circle" size={42} color={colors.primaryDark} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.sidebarProfileName}>{user?.name || "Admin"}</Text>
          <Text style={styles.sidebarProfilePhone}>{user?.phone || "No phone added"}</Text>
        </View>
        <Pressable
          onPress={() => {
            setActiveSection("Profile");
            if (mobile) closeDrawer();
          }}
        >
          <Text style={styles.sidebarEditText}>Edit</Text>
        </Pressable>
      </View>
      <View style={styles.sidebarDivider} />
      <View style={styles.sidebarBottomWrap}>
        <View style={styles.sidebarMenuWrap}>
          {ADMIN_SECTIONS.map((item) => {
            const focused = activeSection === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.sidebarItem, focused && styles.sidebarItemActive]}
                onPress={() => {
                  setActiveSection(item.key);
                  if (mobile) closeDrawer();
                }}
              >
                <Ionicons
                  name={focused ? item.icon.replace("-outline", "") : item.icon}
                  size={18}
                  color={focused ? colors.primaryDark : colors.text}
                />
                <Text style={[styles.sidebarItemText, focused && styles.sidebarItemTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sidebarActions}>
          <Pressable
            style={styles.themeButton}
            onPress={() => {
              toggleTheme();
              if (mobile) closeDrawer();
            }}
          >
            <Ionicons
              name={mode === "dark" ? "sunny-outline" : "moon-outline"}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.themeButtonText}>{mode === "dark" ? "Switch to Light" : "Switch to Dark"}</Text>
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.buttonText} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.layoutRoot}>
      {!isWideLayout && activeSection !== "Dashboard" ? (
        <View style={[styles.mobileHeader, { paddingTop: Math.max(insets.top, TOPIC_HEADER_SAFE_TOP) }]}>
          <Pressable style={styles.mobileBackButton} onPress={() => setActiveSection("Dashboard")}>
            <Ionicons name="arrow-back" size={34} color={colors.text} />
          </Pressable>
          <Text style={styles.mobileHeaderTitle}>{activeMeta.label}</Text>
          <View style={styles.mobileHeaderRightSpace} />
        </View>
      ) : null}

      <View style={styles.contentRow}>
        {isWideLayout ? renderSidebar() : null}
        <View style={styles.mainPanel}>
          <ActiveComponent navigation={navigationProxy} />
        </View>
      </View>

      {!isWideLayout && !drawerVisible ? (
        <View style={styles.edgeSwipeZone} {...edgeSwipeResponder.panHandlers} />
      ) : null}

      {!isWideLayout ? (
        <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
          <View style={styles.drawerLayer}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer}>
              <Animated.View style={[styles.drawerBackdrop, { opacity: drawerOpacity }]} />
            </Pressable>
            <Animated.View
              {...drawerSwipeResponder.panHandlers}
              style={[styles.drawerPanel, { transform: [{ translateX: drawerTranslateX }] }]}
            >
              {renderSidebar({ mobile: true })}
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function StaffShell() {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWideLayout = width >= 900;
  const styles = createStaffStyles(colors, isWideLayout);
  const [activeSection, setActiveSection] = useState("Appointments");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const drawerOpacity = useRef(new Animated.Value(0)).current;

  const staffComponents = {
    Appointments: AdminAppointmentsScreen,
    Inventory: BeauticianInventoryScreen,
    Payments: PaymentScreen,
    AppointmentHistory: BeauticianAppointmentHistoryScreen,
    Feedbacks: FeedbackScreen,
    Profile: ProfileScreen
  };

  const activeMeta = STAFF_SECTIONS.find((item) => item.key === activeSection) || { label: activeSection };
  const ActiveComponent = staffComponents[activeSection] || AdminAppointmentsScreen;

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: -SIDEBAR_WIDTH,
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(drawerOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      })
    ]).start(() => setDrawerVisible(false));
  }, [drawerOpacity, drawerTranslateX]);

  const openDrawer = useCallback(() => {
    drawerTranslateX.setValue(-SIDEBAR_WIDTH);
    drawerOpacity.setValue(0);
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true
      }),
      Animated.timing(drawerOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true
      })
    ]).start();
  }, [drawerOpacity, drawerTranslateX]);

  const navigationProxy = useMemo(
    () => ({
      navigate: (routeName) => {
        if (staffComponents[routeName]) {
          setActiveSection(routeName);
        }
      },
      openSidebar: () => {
        if (!isWideLayout) openDrawer();
      }
    }),
    [isWideLayout, openDrawer]
  );

  const edgeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gestureState) =>
          !isWideLayout &&
          !drawerVisible &&
          evt?.nativeEvent?.pageX <= 24 &&
          gestureState.dx > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 36) openDrawer();
        }
      }),
    [drawerVisible, isWideLayout, openDrawer]
  );

  const drawerSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          drawerVisible &&
          gestureState.dx < -8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -40) closeDrawer();
        }
      }),
    [closeDrawer, drawerVisible]
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          if (drawerVisible) closeDrawer();
          await logout();
        }
      }
    ]);
  };

  const renderSidebar = ({ mobile = false } = {}) => (
    <View style={[styles.sidebar, mobile && styles.mobileSidebar]}>
      <Text style={styles.sidebarTitle}>Beautician Panel</Text>
      <Text style={styles.sidebarSubtitle}>Salon Management</Text>
      <View style={styles.sidebarProfileCard}>
        {user?.profileImage ? (
          <Pressable
            style={styles.sidebarAvatarWrap}
            onPress={() => {
              setActiveSection("Profile");
              if (mobile) closeDrawer();
            }}
          >
            <Animated.Image source={{ uri: user.profileImage }} style={styles.sidebarAvatar} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.sidebarAvatarFallback}
            onPress={() => {
              setActiveSection("Profile");
              if (mobile) closeDrawer();
            }}
          >
            <Ionicons name="person-circle" size={42} color={colors.primaryDark} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.sidebarProfileName}>{user?.name || "Beautician"}</Text>
          <Text style={styles.sidebarProfilePhone}>{user?.phone || "No phone added"}</Text>
        </View>
        <Pressable
          onPress={() => {
            setActiveSection("Profile");
            if (mobile) closeDrawer();
          }}
        >
          <Text style={styles.sidebarEditText}>Edit</Text>
        </Pressable>
      </View>
      <View style={styles.sidebarDivider} />
      <View style={styles.sidebarBottomWrap}>
        <View style={styles.sidebarMenuWrap}>
          {STAFF_SECTIONS.map((item) => {
            const focused = activeSection === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.sidebarItem, focused && styles.sidebarItemActive]}
                onPress={() => {
                  setActiveSection(item.key);
                  if (mobile) closeDrawer();
                }}
              >
                <Ionicons
                  name={focused ? item.icon.replace("-outline", "") : item.icon}
                  size={18}
                  color={focused ? colors.primaryDark : colors.text}
                />
                <Text style={[styles.sidebarItemText, focused && styles.sidebarItemTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sidebarActions}>
          <Pressable
            style={styles.themeButton}
            onPress={() => {
              toggleTheme();
              if (mobile) closeDrawer();
            }}
          >
            <Ionicons
              name={mode === "dark" ? "sunny-outline" : "moon-outline"}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.themeButtonText}>{mode === "dark" ? "Switch to Light" : "Switch to Dark"}</Text>
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.buttonText} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.layoutRoot}>
      {!isWideLayout && activeSection !== "Appointments" ? (
        <View style={[styles.mobileHeader, { paddingTop: Math.max(insets.top, TOPIC_HEADER_SAFE_TOP) }]}>
          <Pressable style={styles.mobileBackButton} onPress={() => setActiveSection("Appointments")}>
            <Ionicons name="arrow-back" size={34} color={colors.text} />
          </Pressable>
          <Text style={styles.mobileHeaderTitle}>{activeMeta.label}</Text>
          <View style={styles.mobileHeaderRightSpace} />
        </View>
      ) : null}

      <View style={styles.contentRow}>
        {isWideLayout ? renderSidebar() : null}
        <View style={styles.mainPanel}>
          <ActiveComponent navigation={navigationProxy} />
        </View>
      </View>

      {!isWideLayout && !drawerVisible ? (
        <View style={styles.edgeSwipeZone} {...edgeSwipeResponder.panHandlers} />
      ) : null}

      {!isWideLayout ? (
        <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
          <View style={styles.drawerLayer}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer}>
              <Animated.View style={[styles.drawerBackdrop, { opacity: drawerOpacity }]} />
            </Pressable>
            <Animated.View
              {...drawerSwipeResponder.panHandlers}
              style={[styles.drawerPanel, { transform: [{ translateX: drawerTranslateX }] }]}
            >
              {renderSidebar({ mobile: true })}
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeAnim = useRef(new Animated.Value(0)).current;

  const welcomeText = useMemo(() => {
    if (!user) return "";
    return `Welcome ${user.name || ""}`.replace(/\s+/g, " ").trim();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setShowWelcome(true);
    welcomeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(welcomeAnim, {
        toValue: 0.28,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.spring(welcomeAnim, {
        toValue: 0.5,
        friction: 7,
        tension: 85,
        useNativeDriver: true
      }),
      Animated.delay(1300),
      Animated.timing(welcomeAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      })
    ]).start(() => setShowWelcome(false));
  }, [user, welcomeAnim]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <LoadingState label="Preparing your salon experience..." />
      </View>
    );
  }

  if (!user) return <AuthStack />;
  const content =
    user.role === "admin" ? <AdminShell /> : user.role === "staff" ? <StaffShell /> : <CustomerStack />;

  return (
    <View style={{ flex: 1 }}>
      {content}
      {showWelcome ? (
        <Animated.View
          style={[
            styles.banner,
            {
              backgroundColor: colors.primaryDark,
              opacity: welcomeAnim.interpolate({
                inputRange: [0, 0.15, 0.82, 1],
                outputRange: [0, 1, 1, 0]
              }),
              transform: [
                { perspective: 900 },
                {
                  translateY: welcomeAnim.interpolate({
                    inputRange: [0, 0.28, 0.82, 1],
                    outputRange: [-28, 0, 0, -14]
                  })
                },
                {
                  scale: welcomeAnim.interpolate({
                    inputRange: [0, 0.28, 0.82, 1],
                    outputRange: [0.93, 1.015, 1, 0.97]
                  })
                },
                {
                  rotateX: welcomeAnim.interpolate({
                    inputRange: [0, 0.35, 1],
                    outputRange: ["-14deg", "0deg", "8deg"]
                  })
                }
              ]
            }
          ]}
        >
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTextShadow}>{welcomeText}</Text>
            <Text style={styles.bannerText}>{welcomeText}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    zIndex: 99
  },
  bannerTextWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  bannerTextShadow: {
    position: "absolute",
    color: "rgba(0,0,0,0.22)",
    fontFamily: FONTS.bodySemiBold,
    fontSize: TYPOGRAPHY.xxl,
    textAlign: "center",
    transform: [{ translateY: 2 }]
  },
  bannerText: {
    color: "#fff",
    fontFamily: FONTS.bodySemiBold,
    fontSize: TYPOGRAPHY.xxl,
    textAlign: "center"
  }
});

const createAdminStyles = (colors, isWideLayout) =>
  StyleSheet.create({
    layoutRoot: {
      flex: 1,
      backgroundColor: colors.background
    },
    mobileHeader: {
      minHeight: TOPIC_HEADER_MIN_HEIGHT,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm + 2,
      paddingBottom: SPACING.sm - 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: SPACING.sm + 1,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      shadowOpacity: 0,
      elevation: 0
    },
    mobileBackButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent"
    },
    mobileHeaderTitle: {
      color: colors.text,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.display
    },
    mobileHeaderRightSpace: {
      width: 44
    },
    contentRow: {
      flex: 1,
      flexDirection: "row"
    },
    sidebar: {
      width: SIDEBAR_WIDTH,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
      backgroundColor: colors.card,
      borderRightWidth: 1,
      borderRightColor: colors.border
    },
    mobileSidebar: {
      height: "100%",
      paddingTop: SPACING.xl + 28
    },
    sidebarTitle: {
      color: colors.primaryDark,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.xxl
    },
    sidebarSubtitle: {
      color: colors.muted,
      marginTop: SPACING.xs,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm
    },
    sidebarProfileCard: {
      marginTop: SPACING.md,
      backgroundColor: colors.accent,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm
    },
    sidebarAvatarWrap: {
      borderRadius: 999,
      overflow: "hidden"
    },
    sidebarAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    sidebarAvatarFallback: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border
    },
    sidebarProfileName: {
      color: colors.text,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.xl,
      lineHeight: TYPOGRAPHY.xxl + 1
    },
    sidebarProfilePhone: {
      color: colors.text,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.sm
    },
    sidebarEditText: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.md
    },
    sidebarDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: SPACING.md
    },
    sidebarBottomWrap: {
      flex: 1,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.md
    },
    sidebarMenuWrap: {
      paddingBottom: SPACING.sm
    },
    sidebarItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.xs
    },
    sidebarItemActive: {
      backgroundColor: `${colors.primary}22`,
      borderWidth: 1,
      borderColor: `${colors.primary}66`
    },
    sidebarItemText: {
      color: colors.text,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.md
    },
    sidebarItemTextActive: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold
    },
    sidebarActions: {
      gap: SPACING.sm,
      marginTop: "auto"
    },
    themeButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: RADIUS.md,
      minHeight: 40,
      paddingHorizontal: SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    themeButtonText: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.sm
    },
    logoutButton: {
      backgroundColor: colors.danger,
      borderRadius: RADIUS.md,
      minHeight: 40,
      paddingHorizontal: SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    logoutButtonText: {
      color: colors.buttonText,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.md
    },
    mainPanel: {
      flex: 1,
      borderLeftWidth: isWideLayout ? 0 : 1,
      borderLeftColor: colors.border
    },
    drawerLayer: {
      flex: 1,
      justifyContent: "flex-start"
    },
    drawerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.36)"
    },
    drawerPanel: {
      width: SIDEBAR_WIDTH,
      height: "100%",
      backgroundColor: colors.card,
      borderRightWidth: 1,
      borderRightColor: colors.border
    },
    edgeSwipeZone: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 22,
      zIndex: 10
    }
  });

const createStaffStyles = (colors, isWideLayout) =>
  StyleSheet.create({
    layoutRoot: {
      flex: 1,
      backgroundColor: colors.background
    },
    mobileHeader: {
      minHeight: TOPIC_HEADER_MIN_HEIGHT,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm + 2,
      paddingBottom: SPACING.sm - 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: SPACING.sm + 1,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      shadowOpacity: 0,
      elevation: 0
    },
    mobileBackButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent"
    },
    mobileHeaderTitle: {
      color: colors.text,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.display
    },
    mobileHeaderRightSpace: {
      width: 44
    },
    contentRow: {
      flex: 1,
      flexDirection: "row"
    },
    sidebar: {
      width: SIDEBAR_WIDTH,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
      backgroundColor: colors.card,
      borderRightWidth: 1,
      borderRightColor: colors.border
    },
    mobileSidebar: {
      height: "100%",
      paddingTop: SPACING.xl + 28
    },
    sidebarTitle: {
      color: colors.primaryDark,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.xxl
    },
    sidebarSubtitle: {
      color: colors.muted,
      marginTop: SPACING.xs,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm
    },
    sidebarProfileCard: {
      marginTop: SPACING.md,
      backgroundColor: colors.accent,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm
    },
    sidebarAvatarWrap: {
      borderRadius: 999,
      overflow: "hidden"
    },
    sidebarAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    sidebarAvatarFallback: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border
    },
    sidebarProfileName: {
      color: colors.text,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.xl,
      lineHeight: TYPOGRAPHY.xxl + 1
    },
    sidebarProfilePhone: {
      color: colors.text,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.sm
    },
    sidebarEditText: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.md
    },
    sidebarDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: SPACING.md
    },
    sidebarBottomWrap: {
      flex: 1,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.md
    },
    sidebarMenuWrap: {
      paddingBottom: SPACING.sm
    },
    sidebarItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.xs
    },
    sidebarItemActive: {
      backgroundColor: `${colors.primary}22`,
      borderWidth: 1,
      borderColor: `${colors.primary}66`
    },
    sidebarItemText: {
      color: colors.text,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.md
    },
    sidebarItemTextActive: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold
    },
    sidebarActions: {
      gap: SPACING.sm,
      marginTop: "auto"
    },
    themeButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: RADIUS.md,
      minHeight: 40,
      paddingHorizontal: SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    themeButtonText: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.sm
    },
    logoutButton: {
      backgroundColor: colors.danger,
      borderRadius: RADIUS.md,
      minHeight: 40,
      paddingHorizontal: SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    logoutButtonText: {
      color: colors.buttonText,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.md
    },
    mainPanel: {
      flex: 1,
      borderLeftWidth: isWideLayout ? 0 : 1,
      borderLeftColor: colors.border
    },
    drawerLayer: {
      flex: 1,
      justifyContent: "flex-start"
    },
    drawerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.36)"
    },
    drawerPanel: {
      width: SIDEBAR_WIDTH,
      height: "100%",
      backgroundColor: colors.card,
      borderRightWidth: 1,
      borderRightColor: colors.border
    },
    edgeSwipeZone: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 22,
      zIndex: 10
    }
  });

