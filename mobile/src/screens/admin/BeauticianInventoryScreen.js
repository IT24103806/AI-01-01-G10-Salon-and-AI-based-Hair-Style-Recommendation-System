import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";

const PAYMENT_METHODS = ["cash", "card", "online"];
const money = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

export default function BeauticianInventoryScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [method, setMethod] = useState("online");
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/inventory/products");
      setProducts(response.data.data || []);
    } catch (requestError) {
      setError("Unable to load beautician inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const groupedProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visible = products.filter((item) => {
      if (!item.isActive) return false;
      if (!query) return true;
      return (
        String(item.name || "").toLowerCase().includes(query) ||
        String(item.category || "").toLowerCase().includes(query) ||
        String(item.description || "").toLowerCase().includes(query)
      );
    });

    const grouped = new Map();
    visible.forEach((item) => {
      const key = [
        String(item.name || "").trim().toLowerCase(),
        String(item.category || "").trim().toLowerCase(),
        Number(item.price || 0),
        String(item.description || "").trim().toLowerCase()
      ].join("|");

      if (!grouped.has(key)) {
        grouped.set(key, {
          groupKey: key,
          name: item.name,
          category: item.category,
          description: item.description,
          price: item.price,
          stockQty: 0,
          productImage: item.productImage || "",
          sources: []
        });
      }

      const entry = grouped.get(key);
      const stock = Number(item.stockQty || 0);
      entry.stockQty += stock;
      if (!entry.productImage && item.productImage) {
        entry.productImage = item.productImage;
      }
      entry.sources.push({
        productId: item._id,
        stockQty: stock
      });
      grouped.set(key, entry);
    });

    return Array.from(grouped.values());
  }, [products, search]);

  const selectedProduct = useMemo(
    () => groupedProducts.find((item) => item.groupKey === selectedKey) || null,
    [groupedProducts, selectedKey]
  );

  const placeOrder = async () => {
    if (!selectedProduct) {
      Alert.alert("Select product", "Please choose a product to order.");
      return;
    }

    const qty = Number(String(quantity || "").trim());
    const address = String(deliveryAddress || "").trim();
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert("Validation", "Quantity must be greater than zero");
      return;
    }
    if (!address) {
      Alert.alert("Validation", "Please enter delivery address");
      return;
    }
    if (qty > Number(selectedProduct.stockQty || 0)) {
      Alert.alert("Validation", "Requested quantity exceeds stock");
      return;
    }

    let remaining = qty;
    const items = [];
    (selectedProduct.sources || []).forEach((source) => {
      if (remaining <= 0) return;
      const available = Number(source.stockQty || 0);
      const take = Math.min(available, remaining);
      if (take > 0) {
        items.push({ productId: source.productId, quantity: take });
        remaining -= take;
      }
    });

    if (remaining > 0 || !items.length) {
      Alert.alert("Validation", "Requested quantity exceeds stock");
      return;
    }

    try {
      setSubmitting(true);
      const createRes = await api.post("/inventory/orders", {
        items,
        method,
        deliveryAddress: address,
        note: "Beautician inventory order"
      });
      const orderId = createRes?.data?.data?._id;
      if (orderId) {
        await api.put(`/inventory/orders/${orderId}/status`, {
          status: "paid",
          method,
          note: "Beautician inventory order paid"
        });
      }
      Alert.alert("Success", "Order placed successfully");
      setQuantity("1");
      setDeliveryAddress("");
      await fetchProducts();
    } catch (requestError) {
      Alert.alert("Order failed", requestError?.response?.data?.message || "Please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={groupedProducts}
        keyExtractor={(item) => item.groupKey}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProducts} />}
        ListHeaderComponent={
          <View>
            <InputField
              label="Search Beautician Products"
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, category, description"
            />

            {selectedProduct ? (
              <View style={styles.checkoutCard}>
                <Text style={styles.checkoutTitle}>Place Order</Text>
                <Text style={styles.meta}>Product: {selectedProduct.name}</Text>
                <Text style={styles.meta}>Available Stock: {selectedProduct.stockQty}</Text>
                <Text style={styles.meta}>Unit Price: {money(selectedProduct.price)}</Text>
                <InputField
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="Enter quantity"
                />
                <InputField
                  label="Delivery Address"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  placeholder="Enter delivery address"
                />
                <Text style={styles.methodLabel}>Payment Method</Text>
                <View style={styles.methodRow}>
                  {PAYMENT_METHODS.map((option) => {
                    const active = method === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.methodChip, active && styles.methodChipActive]}
                        onPress={() => setMethod(option)}
                      >
                        <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>
                          {option.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <PrimaryButton title="Place Order" loading={submitting} onPress={placeOrder} />
              </View>
            ) : (
              <View style={styles.checkoutCard}>
                <Text style={styles.checkoutTitle}>Place Order</Text>
                <Text style={styles.meta}>Select a product below to place an order.</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading beautician inventory..." />
          ) : error ? (
            <ErrorState title="Inventory unavailable" subtitle="Please retry." onRetry={fetchProducts} />
          ) : (
            <EmptyState title="No beautician products" subtitle="Admin can add beautician inventory items." />
          )
        }
        renderItem={({ item }) => {
          const outOfStock = Number(item.stockQty || 0) <= 0;
          const isSelected = item.groupKey === selectedKey;
          return (
            <View style={[styles.card, isSelected && styles.cardActive]}>
              {item.productImage ? (
                <Image source={{ uri: item.productImage }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>No product image</Text>
                </View>
              )}
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>{money(item.price)}</Text>
              </View>
              <Text style={styles.meta}>Category: {item.category}</Text>
              <Text style={styles.meta}>{item.description || "No description available."}</Text>
              <Text style={[styles.meta, outOfStock && { color: colors.danger }]}>
                Stock: {item.stockQty} {outOfStock ? "(Out of stock)" : ""}
              </Text>
              <PrimaryButton
                title={outOfStock ? "Out of Stock" : isSelected ? "Selected" : "Select Product"}
                disabled={outOfStock}
                variant={isSelected ? "outline" : "solid"}
                style={styles.selectButton}
                onPress={() => setSelectedKey(item.groupKey)}
              />
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    checkoutCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.md,
      marginBottom: SPACING.md
    },
    checkoutTitle: {
      color: colors.primaryDark,
      fontSize: TYPOGRAPHY.xl,
      fontWeight: "800",
      marginBottom: 2
    },
    methodLabel: {
      color: colors.text,
      fontWeight: "700",
      marginTop: 2
    },
    methodRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
      marginBottom: 10
    },
    methodChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    methodChipActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}22`
    },
    methodChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700"
    },
    methodChipTextActive: {
      color: colors.primaryDark
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.md,
      marginBottom: SPACING.md
    },
    cardActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`
    },
    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8
    },
    productImage: {
      width: "100%",
      height: 160,
      borderRadius: 10,
      marginBottom: 10
    },
    imagePlaceholder: {
      width: "100%",
      height: 110,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background
    },
    imagePlaceholderText: {
      color: colors.muted,
      fontWeight: "600"
    },
    name: {
      color: colors.text,
      fontSize: TYPOGRAPHY.xl,
      fontWeight: "700",
      flex: 1
    },
    price: {
      color: colors.primaryDark,
      fontWeight: "800"
    },
    meta: {
      color: colors.muted,
      marginTop: 4
    },
    selectButton: {
      marginTop: SPACING.sm
    }
  });

