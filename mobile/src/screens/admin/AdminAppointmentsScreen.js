import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import DateTimeBar from "../../components/DateTimeBar";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";

const FINAL_STATUSES = new Set(["approved", "rejected"]);

export default function AdminAppointmentsScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/appointments");
      setAppointments(response.data.data || []);
    } catch (error) {
      setError("Unable to load appointments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const visibleAppointments = useMemo(() => {
    if (user?.role !== "staff") return appointments;
    return appointments.filter((item) => {
      const status = String(item?.status || "").toLowerCase();
      return status !== "approved" && status !== "rejected";
    });
  }, [appointments, user?.role]);

  const todayDateKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const parseDateKey = useCallback((rawDate) => {
    const value = String(rawDate || "").trim();
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }, []);

  const todayBookingSummary = useMemo(() => {
    if (user?.role !== "staff") return { count: 0, bookings: [] };

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

    const todayRows = appointments.filter((row) => parseDateKey(row?.date) === todayDateKey);
    const sortedRows = [...todayRows].sort((a, b) => parseTimeValue(a?.time) - parseTimeValue(b?.time));

    return {
      count: todayRows.length,
      bookings: sortedRows
    };
  }, [appointments, parseDateKey, todayDateKey, user?.role]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}`, { status });
      await fetchAppointments();
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.message || "Could not update appointment");
    }
  };

  const removeAppointment = async (id) => {
    try {
      await api.delete(`/appointments/${id}`);
      await fetchAppointments();
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.message || "Could not delete appointment");
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={visibleAppointments}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAppointments} />}
        ListHeaderComponent={
          user?.role === "staff" ? (
            <View style={styles.headerWrap}>
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
                  <Text style={styles.greetingTitle}>
                    {new Date().getHours() >= 17
                      ? "Good evening"
                      : new Date().getHours() >= 12
                      ? "Good afternoon"
                      : "Good morning"}
                  </Text>
                  <Text style={styles.greetingName}>{user?.name || "Beautician"}</Text>
                </View>
                <Pressable
                  style={styles.profileButton}
                  onPress={() => {
                    if (typeof navigation?.openSidebar === "function") {
                      navigation.openSidebar();
                    }
                  }}
                >
                  <Ionicons name="person-circle-outline" size={34} color={colors.primaryDark} />
                </Pressable>
              </View>
              <View style={styles.todayBookingCard}>
                <Text style={styles.todayBookingTitle}>Today Bookings</Text>
                <Text style={styles.todayBookingCount}>{todayBookingSummary.count}</Text>
                <Text style={styles.todayBookingHint}>Tap to view today's bookings</Text>
                {todayBookingSummary.bookings.length ? (
                  <View style={styles.todayBookingDetails}>
                    {todayBookingSummary.bookings.map((booking, index) => (
                      <View
                        key={booking?._id || `${booking?.appointmentNumber || "today"}-${index}`}
                        style={[styles.todayBookingItem, index > 0 && styles.todayBookingItemSpaced]}
                      >
                        <Text style={styles.todayBookingLine}>#{index + 1}</Text>
                        <Text style={styles.todayBookingLine}>Service: {booking?.serviceId?.name || "N/A"}</Text>
                        <Text style={styles.todayBookingLine}>Customer: {booking?.userId?.name || "N/A"}</Text>
                        <Text style={styles.todayBookingLine}>
                          Time: {booking?.time || "N/A"} | Status: {booking?.status || "N/A"}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.todayBookingEmpty}>No bookings for today.</Text>
                )}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading appointments..." />
          ) : error ? (
            <ErrorState title="Could not load appointments" subtitle="Please retry." onRetry={fetchAppointments} />
          ) : (
            <EmptyState
              title={user?.role === "staff" ? "No active appointments" : "No appointments yet"}
              subtitle={
                user?.role === "staff"
                  ? "Approved/rejected appointments will appear in Appointment History."
                  : "Appointments will appear here."
              }
            />
          )
        }
        renderItem={({ item }) => {
          const statusValue = String(item?.status || "").toLowerCase();
          const isFinalStatus = FINAL_STATUSES.has(statusValue);

          return (
            <View style={styles.card}>
              <Text style={styles.service}>{item.serviceId?.name || "Service"}</Text>
              <Text style={styles.meta}>Customer: {item.userId?.name || "N/A"}</Text>
              <Text style={styles.meta}>Beautician: {item.staffId?.name || "N/A"}</Text>
              <Text style={styles.meta}>
                Date/Time: {item.date} {item.time}
              </Text>
              <Text style={styles.meta}>Status: {item.status}</Text>
              {!isFinalStatus ? (
                <View style={styles.row}>
                  <PrimaryButton
                    title="Approve"
                    variant="success"
                    style={styles.rowButton}
                    onPress={() => updateStatus(item._id, "approved")}
                  />
                  <PrimaryButton
                    title="Reject"
                    variant="outline"
                    style={styles.rowButton}
                    onPress={() => updateStatus(item._id, "rejected")}
                  />
                  {user?.role === "admin" ? (
                    <PrimaryButton
                      title="Delete"
                      style={styles.rowButton}
                      onPress={() => removeAppointment(item._id)}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    headerWrap: {
      marginBottom: SPACING.xs
    },
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
    profileButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      paddingHorizontal: 0,
      paddingVertical: 0,
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      borderColor: colors.border
    },
    todayBookingCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.sm + 2,
      marginBottom: SPACING.md
    },
    todayBookingTitle: {
      color: colors.muted,
      fontSize: TYPOGRAPHY.md,
      fontFamily: FONTS.bodySemiBold
    },
    todayBookingCount: {
      marginTop: 2,
      fontSize: TYPOGRAPHY.xxl,
      fontFamily: FONTS.heading,
      color: colors.primaryDark
    },
    todayBookingDetails: {
      marginTop: SPACING.xs + 2
    },
    todayBookingItem: {},
    todayBookingItemSpaced: {
      marginTop: SPACING.xs + 4,
      paddingTop: SPACING.xs + 2,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    todayBookingHint: {
      color: colors.muted,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.xs,
      marginTop: 1
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
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.primaryDark,
      marginBottom: 12
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10
    },
    service: { fontWeight: "700", fontSize: 16, color: colors.text },
    meta: { color: colors.muted, marginVertical: 3 },
    row: { flexDirection: "row", gap: 10, marginTop: 8 },
    rowButton: { flex: 1, paddingVertical: 11 }
  });


