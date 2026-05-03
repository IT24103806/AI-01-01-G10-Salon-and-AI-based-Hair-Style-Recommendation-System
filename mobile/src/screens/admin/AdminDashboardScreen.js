import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../../components/ScreenContainer";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";
import DateTimeBar from "../../components/DateTimeBar";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";

export default function AdminDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);
  const [stats, setStats] = useState({
    services: 0,
    staff: 0,
    users: 0,
    appointments: 0,
    payments: 0,
    todayIncome: 0,
    todayBookings: 0
  });
  const [todayBooking, setTodayBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17) return "Good evening";
    return "Good morning";
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [servicesRes, staffRes, usersRes, appointmentsRes, paymentsRes] = await Promise.all([
        api.get("/services"),
        api.get("/staff"),
        api.get("/auth/users"),
        api.get("/appointments"),
        api.get("/payments")
      ]);
      const paymentRows = paymentsRes.data.data || [];
      const appointmentRows = appointmentsRes.data.data || [];
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const parseDateKey = (rawDate) => {
        const value = String(rawDate || "").trim();
        if (!value) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "";
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
      };
      const todayAppointments = appointmentRows.filter((row) => parseDateKey(row?.date) === todayKey);
      const parseTimeValue = (rawTime) => {
        const text = String(rawTime || "").trim();
        if (!text) return -1;
        const full = text.match(/AM|PM/i) ? text : `${text} AM`;
        const parsed = new Date(`1970-01-01 ${full}`);
        if (!Number.isNaN(parsed.getTime())) return parsed.getHours() * 60 + parsed.getMinutes();
        const [h, m] = text.split(":");
        const hh = Number(h);
        const mm = Number(m);
        return Number.isFinite(hh) && Number.isFinite(mm) ? hh * 60 + mm : -1;
      };
      const sortedToday = [...todayAppointments].sort((a, b) => parseTimeValue(a?.time) - parseTimeValue(b?.time));
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const upcoming = sortedToday.find((row) => parseTimeValue(row?.time) >= nowMinutes);
      const latestPast = [...sortedToday].reverse().find((row) => parseTimeValue(row?.time) < nowMinutes);
      setTodayBooking(upcoming || latestPast || sortedToday[0] || null);
      const todayIncome = paymentRows.reduce((sum, payment) => {
        const status = String(payment?.status || "").toLowerCase();
        if (status !== "paid") return sum;
        const paidAt = payment?.paidAt || payment?.updatedAt || payment?.createdAt;
        const paidTime = new Date(paidAt);
        if (Number.isNaN(paidTime.getTime())) return sum;
        if (paidTime < startOfDay || paidTime >= endOfDay) return sum;
        return sum + Number(payment?.amount || 0);
      }, 0);
      setStats({
        services: servicesRes.data.data?.length || 0,
        staff: staffRes.data.data?.length || 0,
        users: usersRes.data.data?.length || 0,
        appointments: appointmentRows.length || 0,
        payments: paymentRows.length || 0,
        todayIncome,
        todayBookings: todayAppointments.length
      });
    } catch (error) {
      setError("Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <ScreenContainer>
      <View style={styles.topOptionsRow}>
        <View />
        <Pressable
          style={styles.topOptionsButton}
          onPress={() => {
            if (typeof navigation?.openSidebar === "function") {
              navigation.openSidebar();
            }
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </Pressable>
      </View>
      <DateTimeBar />
      <View style={styles.greetingCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingTitle}>{greeting}</Text>
          <Text style={styles.greetingName}>{user?.name || "Admin"}</Text>
        </View>
        <Pressable
          style={styles.profileIconButton}
          onPress={() => {
            if (typeof navigation?.openSidebar === "function") {
              navigation.openSidebar();
            }
          }}
        >
          <Ionicons name="person-circle-outline" size={38} color={colors.primaryDark} />
        </Pressable>
      </View>
      {loading ? <LoadingState label="Loading dashboard..." /> : null}
      {error ? <ErrorState title="Dashboard unavailable" subtitle="Please retry." onRetry={loadDashboard} /> : null}
      {!loading && !error ? <View style={styles.grid}>
        <Pressable style={styles.card} onPress={() => navigation.navigate("Services")}>
          <Text style={styles.count}>{stats.services}</Text>
          <Text style={styles.label}>Services</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => navigation.navigate("Staff")}>
          <Text style={styles.count}>{stats.staff}</Text>
          <Text style={styles.label}>Beauticians</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => navigation.navigate("Appointments")}>
          <Text style={styles.count}>{stats.appointments}</Text>
          <Text style={styles.label}>Appointments</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => navigation.navigate("Users")}>
          <Text style={styles.count}>{stats.users}</Text>
          <Text style={styles.label}>Users</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => navigation.navigate("Payments")}>
          <Text style={styles.count}>{stats.payments}</Text>
          <Text style={styles.label}>Payments</Text>
        </Pressable>
        <View style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Today Income</Text>
          <Text style={styles.incomeAmount}>LKR {Number(stats.todayIncome || 0).toLocaleString()}</Text>
        </View>
      </View> : null}
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    topOptionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACING.sm,
      marginTop: SPACING.sm
    },
    topOptionsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center"
    },
    greetingCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.sm + 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACING.md
    },
    profileIconButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.border
    },
    greetingTitle: {
      fontSize: TYPOGRAPHY.xl,
      fontFamily: FONTS.heading,
      color: colors.primaryDark,
      lineHeight: TYPOGRAPHY.xxl + 2
    },
    greetingName: {
      fontSize: TYPOGRAPHY.xxl,
      fontFamily: FONTS.heading,
      color: colors.text,
      marginTop: SPACING.xs
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    incomeCard: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border
    },
    incomeLabel: {
      color: colors.muted,
      fontSize: TYPOGRAPHY.md,
      fontFamily: FONTS.bodySemiBold
    },
    incomeAmount: {
      marginTop: 4,
      fontSize: TYPOGRAPHY.display,
      fontFamily: FONTS.heading,
      color: colors.primaryDark
    },
    todayBookingCard: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border
    },
    todayBookingTitle: {
      color: colors.muted,
      fontSize: TYPOGRAPHY.md,
      fontFamily: FONTS.bodySemiBold
    },
    todayBookingCount: {
      marginTop: 4,
      fontSize: TYPOGRAPHY.display,
      fontFamily: FONTS.heading,
      color: colors.primaryDark
    },
    todayBookingDetails: {
      marginTop: SPACING.xs + 2
    },
    todayBookingLine: {
      color: colors.text,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.sm,
      marginTop: 2
    },
    todayBookingEmpty: {
      color: colors.muted,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.sm,
      marginTop: SPACING.xs + 2
    },
    card: {
      width: "48%",
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border
    },
    count: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.primary
    },
    label: {
      color: colors.muted
    }
  });


