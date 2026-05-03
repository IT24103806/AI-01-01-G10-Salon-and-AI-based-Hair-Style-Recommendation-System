import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { SLOT_OPTIONS } from "../../constants/slots";

const initialForm = { id: "", name: "", email: "", password: "", role: "", availableSlots: [] };
const formatSlotsLabel = (slots) => {
  if (!slots?.length) return "Select available slots";
  if (slots.length <= 2) return slots.join(", ");
  return `${slots.slice(0, 2).join(", ")} +${slots.length - 2}`;
};

export default function ManageStaffScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slotsModalVisible, setSlotsModalVisible] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/staff");
      setStaff(response.data.data || []);
    } catch (error) {
      setError("Could not load beauticians");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const submit = async () => {
    if (!form.name.trim() || !form.role.trim()) {
      Alert.alert("Validation", "Beautician name and role are required");
      return;
    }
    if (!form.id && String(form.password || "").length < 6) {
      Alert.alert("Validation", "Login password must be at least 6 characters");
      return;
    }
    if (!form.availableSlots.length) {
      Alert.alert("Validation", "Please select at least one available slot");
      return;
    }
    if (form.email && !String(form.email).includes("@")) {
      Alert.alert("Validation", "Please enter a valid email address");
      return;
    }
    try {
      const payload = {
        name: form.name,
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        availableSlots: form.availableSlots
      };
      if (form.id) {
        await api.put(`/staff/${form.id}`, payload);
      } else {
        await api.post("/staff", payload);
      }
      setForm(initialForm);
      await fetchStaff();
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.message || "Save failed");
    }
  };

  const removeStaff = async (id) => {
    try {
      await api.delete(`/staff/${id}`);
      await fetchStaff();
    } catch (error) {
      Alert.alert("Error", "Delete failed");
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={staff}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStaff} />}
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading beauticians..." />
          ) : error ? (
            <ErrorState title="Beautician list unavailable" subtitle="Please retry." onRetry={fetchStaff} />
          ) : (
            <EmptyState title="No beautician profiles" subtitle="Create beautician entries to manage schedules." />
          )
        }
        ListHeaderComponent={
          <View style={styles.formCard}>
            <InputField
              label="Name"
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
            />
            <InputField
              label="Email (for notifications)"
              value={form.email}
              onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
              placeholder="Enter email"
              keyboardType="email-address"
            />
            <InputField
              label="Role"
              value={form.role}
              onChangeText={(value) => setForm((prev) => ({ ...prev, role: value }))}
            />
            <InputField
              label={form.id ? "Reset Login Password (optional)" : "Login Password"}
              value={form.password}
              onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
              placeholder={form.id ? "Enter new password to reset" : "Minimum 6 characters"}
              secureTextEntry
            />
            <InputField
              label="Available Slots"
              value={formatSlotsLabel(form.availableSlots)}
              editable={false}
              placeholder="Select available slots"
            />
            <PrimaryButton title="Select Slots" variant="outline" onPress={() => setSlotsModalVisible(true)} />
            <PrimaryButton title={form.id ? "Update Beautician" : "Create Beautician"} onPress={submit} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>Beautician ID: {item.staffCode || item._id}</Text>
            <Text style={styles.meta}>Email: {item.email || "N/A"}</Text>
            <Text style={styles.meta}>Role: {item.role}</Text>
            <Text style={styles.meta}>Slots: {(item.availableSlots || []).join(", ") || "N/A"}</Text>
            <View style={styles.row}>
              <PrimaryButton
                title="Edit"
                variant="outline"
                style={styles.rowButton}
                onPress={() =>
                  setForm({
                    id: item._id,
                    name: item.name,
                    email: item.email || "",
                    password: "",
                    role: item.role,
                    availableSlots: Array.isArray(item.availableSlots) ? item.availableSlots : []
                  })
                }
              />
              <PrimaryButton title="Delete" style={styles.rowButton} onPress={() => removeStaff(item._id)} />
            </View>
          </View>
        )}
      />

      <Modal visible={slotsModalVisible} transparent animationType="slide" onRequestClose={() => setSlotsModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Available Slots</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {SLOT_OPTIONS.map((slot) => {
                const active = form.availableSlots.includes(slot);
                return (
                  <Pressable
                    key={slot}
                    style={[styles.slotOption, active && styles.slotOptionActive]}
                    onPress={() =>
                      setForm((prev) => ({
                        ...prev,
                        availableSlots: active
                          ? prev.availableSlots.filter((item) => item !== slot)
                          : [...prev.availableSlots, slot]
                      }))
                    }
                  >
                    <Text style={[styles.slotOptionText, active && styles.slotOptionTextActive]}>{slot}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <PrimaryButton title="Done" onPress={() => setSlotsModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.primaryDark,
      marginBottom: 12
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12
    },
    itemCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10
    },
    name: { fontWeight: "700", fontSize: 16, color: colors.text },
    meta: { color: colors.muted, marginVertical: 3 },
    row: { flexDirection: "row", gap: 10, marginTop: 8 },
    rowButton: { flex: 1, paddingVertical: 11 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end"
    },
    modalCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16
    },
    modalTitle: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 16,
      marginBottom: 10
    },
    slotOption: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      marginBottom: 8
    },
    slotOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary
    },
    slotOptionText: {
      color: colors.text,
      fontWeight: "600"
    },
    slotOptionTextActive: {
      color: colors.buttonText
    }
  });
