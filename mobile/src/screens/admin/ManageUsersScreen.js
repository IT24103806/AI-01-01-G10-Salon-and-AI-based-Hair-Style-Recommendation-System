import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";

const ROLE_OPTIONS = [
  { label: "Customer", value: "customer" },
  { label: "Beautician", value: "staff" },
  { label: "Admin", value: "admin" }
];

const APPROVAL_OPTIONS = [
  { label: "Approved", value: "approved" },
  { label: "Pending", value: "pending" }
];

const prettyRole = (role) => {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "staff") return "Beautician";
  if (normalized === "admin") return "Admin";
  return "Customer";
};

const prettyApproval = (value) => {
  const normalized = String(value || "").toLowerCase();
  return normalized === "approved" ? "Approved" : "Pending";
};

export default function ManageUsersScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [draftRole, setDraftRole] = useState("customer");
  const [draftIsActive, setDraftIsActive] = useState(true);
  const [draftApproval, setDraftApproval] = useState("pending");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/auth/users");
      setUsers(response.data?.data || []);
    } catch (requestError) {
      setError("Could not load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const aAdmin = String(a?.role || "").toLowerCase() === "admin";
        const bAdmin = String(b?.role || "").toLowerCase() === "admin";
        if (aAdmin && !bAdmin) return 1;
        if (!aAdmin && bAdmin) return -1;
        const aCreated = new Date(a?.createdAt || 0).getTime();
        const bCreated = new Date(b?.createdAt || 0).getTime();
        return bCreated - aCreated;
      }),
    [users]
  );

  const openEditor = (user) => {
    setEditingUser(user);
    setDraftRole(String(user?.role || "customer").toLowerCase());
    setDraftIsActive(Boolean(user?.isActive));
    setDraftApproval(String(user?.staffApprovalStatus || "approved").toLowerCase());
  };

  const closeEditor = () => {
    setEditingUser(null);
  };

  const saveUser = async () => {
    if (!editingUser?._id) return;
    try {
      setSaving(true);
      const payload = {
        role: draftRole,
        isActive: draftIsActive
      };
      if (draftRole === "staff") {
        payload.staffApprovalStatus = draftApproval;
      }
      await api.put(`/auth/users/${editingUser._id}`, payload);
      closeEditor();
      await fetchUsers();
    } catch (requestError) {
      Alert.alert("Update failed", requestError?.response?.data?.message || "Could not update user");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = (user) => {
    Alert.alert(
      "Delete user",
      `Delete ${user?.name || "this user"} permanently?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/auth/users/${user._id}`);
              await fetchUsers();
            } catch (requestError) {
              Alert.alert("Delete failed", requestError?.response?.data?.message || "Could not delete user");
            }
          }
        }
      ]
    );
  };

  const renderUserItem = ({ item }) => {
    const role = String(item?.role || "").toLowerCase();
    const isAdmin = role === "admin";
    const isStaff = role === "staff";
    const blocked = !Boolean(item?.isActive);
    return (
      <View style={styles.userCard}>
        <View style={styles.userTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{item?.name || "Unnamed user"}</Text>
            <Text style={styles.userEmail}>{item?.email || "No email"}</Text>
          </View>
          <View style={styles.chipWrap}>
            <View style={[styles.chip, styles.roleChip]}>
              <Text style={styles.chipText}>{prettyRole(item?.role)}</Text>
            </View>
            <View style={[styles.chip, blocked ? styles.blockedChip : styles.activeChip]}>
              <Text style={styles.chipText}>{blocked ? "Blocked" : "Active"}</Text>
            </View>
            {isStaff ? (
              <View style={[styles.chip, item?.staffApprovalStatus === "approved" ? styles.approvedChip : styles.pendingChip]}>
                <Text style={styles.chipText}>{prettyApproval(item?.staffApprovalStatus)}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={styles.userMeta}>Phone: {item?.phone || "N/A"}</Text>
        <View style={styles.actionRow}>
          <PrimaryButton title="Manage" variant="outline" style={styles.actionBtn} onPress={() => openEditor(item)} />
          <PrimaryButton
            title="Delete"
            style={styles.actionBtn}
            disabled={isAdmin}
            onPress={() => removeUser(item)}
          />
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={sortedUsers}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchUsers} />}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>Registered Users</Text>
            <Text style={styles.headerSubtitle}>
              Manage role, block/unblock accounts, and approve beauticians.
            </Text>
          </View>
        }
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading users..." />
          ) : error ? (
            <ErrorState title="Users unavailable" subtitle="Please retry." onRetry={fetchUsers} />
          ) : (
            <EmptyState title="No users found" subtitle="Registered users will appear here." />
          )
        }
      />

      <Modal visible={Boolean(editingUser)} transparent animationType="slide" onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Manage User</Text>
            <Text style={styles.modalName}>{editingUser?.name || ""}</Text>
            <Text style={styles.modalEmail}>{editingUser?.email || ""}</Text>

            <Text style={styles.sectionLabel}>Role</Text>
            <View style={styles.optionRow}>
              {ROLE_OPTIONS.map((option) => {
                const selected = draftRole === option.value;
                const disabled =
                  String(editingUser?.role || "").toLowerCase() === "admin" && option.value !== "admin";
                return (
                  <Pressable
                    key={option.value}
                    disabled={disabled}
                    style={[styles.optionButton, selected && styles.optionButtonActive, disabled && styles.optionDisabled]}
                    onPress={() => setDraftRole(option.value)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {String(editingUser?.role || "").toLowerCase() === "admin" ? (
              <Text style={styles.helperText}>Admin users cannot be changed to another role.</Text>
            ) : null}

            <Text style={styles.sectionLabel}>Account Status</Text>
            <View style={styles.optionRow}>
              <Pressable
                style={[styles.optionButton, draftIsActive && styles.optionButtonActive]}
                onPress={() => setDraftIsActive(true)}
              >
                <Text style={[styles.optionText, draftIsActive && styles.optionTextActive]}>Active</Text>
              </Pressable>
              <Pressable
                style={[styles.optionButton, !draftIsActive && styles.optionButtonActive]}
                onPress={() => setDraftIsActive(false)}
              >
                <Text style={[styles.optionText, !draftIsActive && styles.optionTextActive]}>Temporarily Blocked</Text>
              </Pressable>
            </View>

            {draftRole === "staff" ? (
              <>
                <Text style={styles.sectionLabel}>Beautician Approval</Text>
                <View style={styles.optionRow}>
                  {APPROVAL_OPTIONS.map((option) => {
                    const selected = draftApproval === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[styles.optionButton, selected && styles.optionButtonActive]}
                        onPress={() => setDraftApproval(option.value)}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <PrimaryButton title="Cancel" variant="outline" style={styles.modalActionButton} onPress={closeEditor} />
              <PrimaryButton title="Save" style={styles.modalActionButton} onPress={saveUser} loading={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    listContent: {
      paddingBottom: SPACING.lg
    },
    headerCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.md,
      marginBottom: SPACING.sm
    },
    headerTitle: {
      color: colors.primaryDark,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.xl
    },
    headerSubtitle: {
      marginTop: SPACING.xs,
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm
    },
    userCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.md,
      marginBottom: SPACING.sm
    },
    userTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: SPACING.md
    },
    userName: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.lg
    },
    userEmail: {
      marginTop: 2,
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm
    },
    userMeta: {
      marginTop: SPACING.xs,
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm
    },
    chipWrap: {
      alignItems: "flex-end",
      gap: 6
    },
    chip: {
      borderRadius: RADIUS.pill,
      paddingHorizontal: SPACING.sm + 2,
      paddingVertical: 4
    },
    chipText: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.xs
    },
    roleChip: {
      backgroundColor: `${colors.primary}20`
    },
    activeChip: {
      backgroundColor: `${colors.success}22`
    },
    blockedChip: {
      backgroundColor: `${colors.danger}26`
    },
    approvedChip: {
      backgroundColor: `${colors.success}22`
    },
    pendingChip: {
      backgroundColor: `${colors.primary}20`
    },
    actionRow: {
      flexDirection: "row",
      gap: SPACING.sm,
      marginTop: SPACING.sm
    },
    actionBtn: {
      flex: 1
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.36)",
      justifyContent: "flex-end"
    },
    modalCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: RADIUS.lg,
      borderTopRightRadius: RADIUS.lg,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border
    },
    modalTitle: {
      color: colors.text,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.xl
    },
    modalName: {
      marginTop: SPACING.xs,
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.md
    },
    modalEmail: {
      marginTop: 2,
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm
    },
    sectionLabel: {
      marginTop: SPACING.md,
      marginBottom: SPACING.xs,
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.sm
    },
    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACING.xs
    },
    optionButton: {
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: SPACING.sm + 2,
      paddingVertical: SPACING.xs + 1,
      backgroundColor: colors.card
    },
    optionButtonActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}20`
    },
    optionText: {
      color: colors.text,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.sm
    },
    optionTextActive: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold
    },
    optionDisabled: {
      opacity: 0.45
    },
    helperText: {
      marginTop: SPACING.xs,
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.xs
    },
    modalActions: {
      flexDirection: "row",
      gap: SPACING.sm,
      marginTop: SPACING.md
    },
    modalActionButton: {
      flex: 1
    }
  });
