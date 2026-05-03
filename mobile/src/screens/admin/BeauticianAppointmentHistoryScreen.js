import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const HISTORY_STATUSES = new Set(["approved", "rejected", "cancelled", "rescheduled"]);

const toDateTime = (date, time) => {
  const base = String(date || "").trim();
  if (!base) return null;
  const rawTime = String(time || "00:00").trim();
  const normalizedTime = rawTime.match(/AM|PM/i) ? rawTime : `${rawTime} AM`;
  const parsed = new Date(`${base} ${normalizedTime}`);
  return Number.isNaN(parsed.getTime()) ? new Date(`${base}T00:00:00`) : parsed;
};

export default function BeauticianAppointmentHistoryScreen() {
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
    } catch (requestError) {
      setError("Unable to load appointment history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const historyItems = useMemo(() => {
    const now = new Date();
    const statusPriority = (status) => {
      const value = String(status || "").toLowerCase();
      if (value === "approved") return 0;
      if (value === "rejected") return 1;
      return 2;
    };
    return appointments
      .filter((item) => {
        const status = String(item?.status || "").toLowerCase();
        if (HISTORY_STATUSES.has(status)) return true;
        const dt = toDateTime(item?.date, item?.time);
        return dt ? dt < now : false;
      })
      .sort((a, b) => {
        const statusDiff = statusPriority(a?.status) - statusPriority(b?.status);
        if (statusDiff !== 0) return statusDiff;
        const at = toDateTime(a?.date, a?.time)?.getTime() || 0;
        const bt = toDateTime(b?.date, b?.time)?.getTime() || 0;
        return bt - at;
      });
  }, [appointments]);

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={historyItems}
        keyExtractor={(item, index) => String(item?._id || item?.appointmentNumber || index)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAppointments} />}
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading history..." />
          ) : error ? (
            <ErrorState title="History unavailable" subtitle="Please retry." onRetry={fetchAppointments} />
          ) : (
            <EmptyState title="No history entries" subtitle="Completed or older appointments will show here." />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>ID #{item.appointmentNumber || "-"}</Text>
            </View>
            <Text style={styles.service}>{item.serviceId?.name || "Service"}</Text>
            <Text style={styles.meta}>Customer: {item.userId?.name || "N/A"}</Text>
            <Text style={styles.meta}>Beautician: {item.staffId?.name || "N/A"}</Text>
            <Text style={styles.meta}>
              Date/Time: {item.date} {item.time}
            </Text>
            <Text
              style={[
                styles.meta,
                styles.statusText,
                String(item?.status || "").toLowerCase() === "approved"
                  ? styles.statusApproved
                  : String(item?.status || "").toLowerCase() === "rejected"
                  ? styles.statusRejected
                  : null
              ]}
            >
              Status: {item.status}
            </Text>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border
    },
    badgeWrap: {
      alignSelf: "flex-start",
      backgroundColor: `${colors.primary}20`,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 6
    },
    badgeText: {
      color: colors.primaryDark,
      fontWeight: "700",
      fontSize: 12
    },
    service: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text
    },
    meta: {
      color: colors.muted,
      marginTop: 4
    },
    statusText: {
      fontWeight: "700"
    },
    statusApproved: {
      color: colors.success || "#16a34a"
    },
    statusRejected: {
      color: "#7f1d1d"
    }
  });
