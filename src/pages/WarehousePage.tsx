import { useEffect, useMemo, useState } from "react";
import { useBranch } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, Search, Warehouse as WarehouseIcon, ArrowRight, AlertTriangle, Plus, Layers, BarChart3, Bell, Pencil, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface WarehouseItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  reserved?: number;
  minStockLevel?: number;
  unit: string;
  purchasePrice?: number;
  sellingPrice?: number;
  categoryId?: string;
  description?: string;
  supplier?: string;
}

interface WarehouseStats {
  totalItems: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  totalQuantity: number;
}

const formatNumber = (val: number | undefined | null) => (val ?? 0).toLocaleString("ru-RU");

export default function WarehousePage() {
  const { currentBranch, branches, orgData } = useBranch();
  const { user } = useAuth();
  const { t } = useLocale();

  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<WarehouseStats>({
    totalItems: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
    totalQuantity: 0,
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Один лист на 50 товаров
  const [limit] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchId, setSearchId] = useState(""); // legacy: kept for minimal change
  const [searchSku, setSearchSku] = useState(""); // legacy: kept for minimal change
  const [searchKey, setSearchKey] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inventorySku, setInventorySku] = useState("");
  const [inventoryQty, setInventoryQty] = useState("");
  const [inventoryNewQty, setInventoryNewQty] = useState("");
  const [inventoryNote, setInventoryNote] = useState("");
  const [inventoryMessage, setInventoryMessage] = useState<string | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState<string | null>(null);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [inventoryAction, setInventoryAction] = useState<"receive" | "writeoff" | "reserve" | "cancel" | "adjust" | "check">("receive");
  const [bulkPayload, setBulkPayload] = useState("");
  const [bulkSkus, setBulkSkus] = useState("");
  const [bulkPurchasePrice, setBulkPurchasePrice] = useState("");
  const [bulkSellingPrice, setBulkSellingPrice] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState("");
  const [bulkPercent, setBulkPercent] = useState("");
  const [bulkSourceSku, setBulkSourceSku] = useState("");
  const [bulkNewSku, setBulkNewSku] = useState("");
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [categoryCode, setCategoryCode] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  const [categorySort, setCategorySort] = useState("");
  const [categoryIdInput, setCategoryIdInput] = useState("");
  const [categoryCodeInput, setCategoryCodeInput] = useState("");
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"items" | "inventory" | "bulk" | "categories">("items");
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "",
    unit: "",
    purchasePrice: "",
    sellingPrice: "",
    categoryId: "",
    minStockLevel: "",
    supplier: "",
    description: "",
    sku: "",
  });
console.log("iitems", items);
  const baseUrl = useMemo(() => {
    const base =
      (import.meta.env.VITE_SECONDARY_BACKEND_URL || "").replace(/\/$/, "");
    return base ? `${base}/warehouse` : "/warehouse";
  }, []);



  const fetchStats = async () => {
    if (!currentBranch?.id || !orgData) {
      console.warn("warehouse stats: no branch or orgData");
      return;
    }
    setIsLoadingStats(true);
    try {
      const url = new URL(`${baseUrl}/statistics/overall`);
      url.searchParams.set("branchId", currentBranch.id.toString());
      url.searchParams.set("organizationId", orgData.toString());
      if (user?.id) url.searchParams.set("userId", user.id.toString());
      url.searchParams.set("_", Date.now().toString());

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalItems: data.totalItems || data.total || 0,
          inStock: data.inStock || 0,
          lowStock: data.lowStock || 0,
          outOfStock: data.outOfStock || 0,
          totalValue: data.totalValue || 0,
          totalQuantity: data.totalQuantity || 0,
        });
      }
    } catch (error) {
      console.error("Failed to load warehouse stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const closeInventoryDialog = () => {
    setInventoryDialogOpen(false);
  };

  const inventoryActionLabel = (a: typeof inventoryAction) => {
    switch (a) {
      case "receive":
        return "Приёмка";
      case "writeoff":
        return "Списание";
      case "reserve":
        return "Резерв";
      case "cancel":
        return "Отмена резерва";
      case "adjust":
        return "Корректировка";
      case "check":
        return "Проверить наличие";
      default:
        return "Операция";
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentBranch?.id || !orgData) {
      console.warn("warehouse delete: no branch or orgData");
      return;
    }
    setDeletingId(id);
    try {
      const url = new URL(`${baseUrl}/${encodeURIComponent(id)}`);
      url.searchParams.set("branchId", currentBranch.id.toString());
      url.searchParams.set("organizationId", orgData.toString());
      if (user?.id) url.searchParams.set("userId", user.id.toString());
      url.searchParams.set("_", Date.now().toString());

      const res = await fetch(url.toString(), {
        method: "DELETE",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Ошибка ${res.status}`);
      }
      // обновляем список
      fetchItems();
    } catch (error) {
      console.error("Failed to delete item:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const fetchItems = async () => {
    if (!currentBranch?.id || !orgData) {
      console.warn("warehouse items: no branch or orgData");
      return;
    }
    setIsLoading(true);
    try {
      const url = new URL(baseUrl);
      url.searchParams.set("branchId", currentBranch.id.toString());
      url.searchParams.set("organizationId", orgData.toString());
      if (user?.id) url.searchParams.set("userId", user.id.toString());
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", limit.toString());
      if (search.trim()) url.searchParams.set("query", search.trim());
      url.searchParams.set("sortOrder", "asc");
      url.searchParams.set("_", Date.now().toString());

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!res.ok) throw new Error(`Failed to load warehouse (${res.status})`);
      const data = await res.json();
      const raw = data?.data ?? data;

      const candidates: any[] = [
        raw,
        raw?.items,
        raw?.data,
        raw?.data?.items,
        raw?.data?.data,
        data?.items,
        data?.data,
        data?.data?.items,
      ].filter(Boolean);

      let list: any[] = candidates.find((c) => Array.isArray(c)) || [];

      // Sometimes arrays hide one level deeper (object with the first array value)
      if (!list.length) {
        const firstArrayValue = candidates
          .map((c) => (typeof c === "object" ? Object.values(c).find(Array.isArray) : undefined))
          .find(Boolean);
        if (Array.isArray(firstArrayValue)) {
          list = firstArrayValue;
        }
      }

      if (!list.length) {
        console.warn("Warehouse: empty list, raw response:", data);
      }

      const pagination =
        data?.pagination ||
        raw?.pagination ||
        data?.meta ||
        raw?.meta;

      if (pagination?.pages) {
        setTotalPages(Number(pagination.pages) || 1);
      } else if (pagination?.total) {
        const totalCalc = Math.max(1, Math.ceil(Number(pagination.total) / limit));
        setTotalPages(totalCalc);
      } else if (list.length < limit) {
        setTotalPages(page); // no more pages beyond current
      }

      setItems(
        list.map((item: any) => ({
          id: item.id?.toString() || item.id || item.sku,
          name: item.name || "Без названия",
          sku: item.sku?.value || item.sku || "",
          quantity: Number(item.stockLevel?.quantity ?? item.quantity ?? 0),
          reserved: Number(item.stockLevel?.reserved ?? 0),
          minStockLevel: item.stockLevel?.minLevel ?? item.min_stock_level,
          unit: item.unit || "",
          purchasePrice: item.price?.purchase?.amount ?? item.purchasePrice ?? item.purchase_price,
          sellingPrice: item.price?.selling?.amount ?? item.sellingPrice ?? item.selling_price,
          categoryId: item.categoryId || item.category_id,
          description: item.description,
          supplier: item.supplier,
        }))
      );
    } catch (error) {
      console.error("Failed to load warehouse items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentBranch?.id, orgData, user?.id]);

  useEffect(() => {
    fetchItems();
  }, [currentBranch?.id, orgData, user?.id, page, limit, search]);

  const lowStock = (item: WarehouseItem) =>
    item.minStockLevel !== undefined && item.quantity <= item.minStockLevel;

  const fetchItemByKey = async () => {
    const key = searchKey.trim();
    if (!key) {
      setPage(1);
      fetchItems();
      return;
    }
    if (!currentBranch?.id || !orgData) {
      console.warn("warehouse item by key: no branch or orgData");
      return;
    }

    const queryParams = new URLSearchParams();
    queryParams.set("branchId", currentBranch.id.toString());
    queryParams.set("organizationId", orgData.toString());
    if (user?.id) queryParams.set("userId", user.id.toString());
    queryParams.set("_", Date.now().toString());

    const attemptFetch = async (path: string) => {
      const url = `${path}?${queryParams.toString()}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}`);
      }
      return res.json();
    };

    setIsLoading(true);
    try {
      let data;
      try {
        data = await attemptFetch(`${baseUrl}/${encodeURIComponent(key)}`);
      } catch (e) {
        data = await attemptFetch(`${baseUrl}/sku/${encodeURIComponent(key)}`);
      }
      const item = data?.data ?? data;
      if (!item || Array.isArray(item)) {
        setItems([]);
      } else {
        setItems([
          {
            id: item.id?.toString() || item.id,
            name: item.name || "Без названия",
            sku: item.sku?.value || item.sku || "",
            quantity: Number(item.stockLevel?.quantity ?? item.quantity ?? 0),
            reserved: Number(item.stockLevel?.reserved ?? 0),
            minStockLevel: item.stockLevel?.minLevel ?? item.min_stock_level,
            unit: item.unit || "",
            purchasePrice: item.price?.purchase?.amount ?? item.purchasePrice ?? item.purchase_price,
            sellingPrice: item.price?.selling?.amount ?? item.sellingPrice ?? item.selling_price,
            categoryId: item.categoryId || item.category_id,
            description: item.description,
            supplier: item.supplier,
          },
        ]);
        setTotalPages(1);
        setPage(1);
      }
    } catch (error) {
      console.error("Failed to load item by key:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };
    const handleUpdateItem = async () => {
    if (!editingId) return;
    if (!currentBranch?.id || !orgData) {
      setCreateMessage("Выберите филиал и организацию");
      return;
    }
    setIsCreating(true);
    setCreateMessage(null);
    try {
      const url = new URL(`${baseUrl}/${encodeURIComponent(editingId)}`);
      url.searchParams.set("branchId", currentBranch.id.toString());
      url.searchParams.set("organizationId", orgData.toString());
      if (user?.id) url.searchParams.set("userId", user.id.toString());

      const form = new FormData();
      form.append("name", newItem.name);
      form.append("quantity", newItem.quantity);
      form.append("unit", newItem.unit);
      form.append("purchasePrice", newItem.purchasePrice);
      form.append("sellingPrice", newItem.sellingPrice);
      form.append("categoryId", newItem.categoryId);
      if (newItem.sku) form.append("sku", newItem.sku);
      if (newItem.minStockLevel) form.append("minStockLevel", newItem.minStockLevel);
      if (newItem.supplier) form.append("supplier", newItem.supplier);
      if (newItem.description) form.append("description", newItem.description);

      const res = await fetch(url.toString(), {
        method: "PUT",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Ошибка ${res.status}`);
      }
      setCreateMessage("Товар обновлён");
      setDialogOpen(false);
      setEditingId(null);
      fetchItems();
    } catch (error: any) {
      setCreateMessage(error?.message || "Не удалось обновить товар");
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (item: WarehouseItem) => {
    setEditingId(item.id);
    setDialogMode("edit");
    setNewItem({
      name: item.name,
      quantity: item.quantity.toString(),
      unit: item.unit,
      purchasePrice: item.purchasePrice?.toString() || "",
      sellingPrice: item.sellingPrice?.toString() || "",
      categoryId: item.categoryId || "",
      minStockLevel: item.minStockLevel?.toString() || "",
      supplier: item.supplier || "",
      description: item.description || "",
      sku: item.sku || "",
    });
    setCreateMessage(null);
    setDialogOpen(true);
  };


  const handleCreateItem = async () => {
    if (!currentBranch?.id || !orgData) {
      setCreateMessage("Выберите филиал и организацию");
      return;
    }
    if (!newItem.name || !newItem.quantity || !newItem.unit || !newItem.purchasePrice || !newItem.sellingPrice || !newItem.categoryId) {
      setCreateMessage("Заполните обязательные поля");
      return;
    }

    setIsCreating(true);
    setCreateMessage(null);
    try {
      const url = new URL(baseUrl);
      url.searchParams.set("branchId", currentBranch.id.toString());
      url.searchParams.set("organizationId", orgData.toString());
      if (user?.id) url.searchParams.set("userId", user.id.toString());

      const form = new FormData();
      form.append("name", newItem.name);
      form.append("quantity", newItem.quantity);
      form.append("unit", newItem.unit);
      form.append("purchasePrice", newItem.purchasePrice);
      form.append("sellingPrice", newItem.sellingPrice);
      form.append("categoryId", newItem.categoryId);
      if (newItem.sku) form.append("sku", newItem.sku);
      if (newItem.minStockLevel) form.append("minStockLevel", newItem.minStockLevel);
      if (newItem.supplier) form.append("supplier", newItem.supplier);
      if (newItem.description) form.append("description", newItem.description);

      const res = await fetch(url.toString(), {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Ошибка ${res.status}`);
      }

      setCreateMessage("Товар создан");
      setNewItem({
        name: "",
        quantity: "",
        unit: "",
        purchasePrice: "",
        sellingPrice: "",
        categoryId: "",
        minStockLevel: "",
        supplier: "",
        description: "",
        sku: "",
      });
      fetchItems();
      setDialogOpen(false);
      setEditingId(null);
    } catch (error: any) {
      setCreateMessage(error?.message || "Не удалось создать товар");
    } finally {
      setIsCreating(false);
    }
  };

  const doInventoryAction = async (action: "receive" | "writeoff" | "reserve" | "cancel" | "adjust" | "check") => {
    if (!currentBranch?.id || !orgData) {
      setInventoryMessage("Выберите филиал и организацию");
      return;
    }
    const skuStr = `${inventorySku ?? ""}`.trim();
    if (!skuStr) {
      setInventoryMessage("Укажите SKU");
      return;
    }

    const qty = Number(inventoryQty);
    const newQty = Number(inventoryNewQty);
    const noteStr = inventoryNote !== undefined && inventoryNote !== null ? String(inventoryNote) : "";

    if (action !== "check" && action !== "adjust" && (!qty || qty <= 0 || Number.isNaN(qty))) {
      setInventoryMessage("Количество должно быть > 0");
      return;
    }
    if (action === "adjust" && (Number.isNaN(newQty) || newQty < 0)) {
      setInventoryMessage("Новое количество должно быть >= 0");
      return;
    }
    if (action === "check" && (!qty || qty <= 0 || Number.isNaN(qty))) {
      setInventoryMessage("Укажите количество для проверки");
      return;
    }

    setInventoryLoading(action);
    setInventoryMessage(null);

    const query = new URLSearchParams();
    query.set("branchId", currentBranch.id.toString());
    query.set("organizationId", orgData.toString());
    if (user?.id) query.set("userId", user.id.toString());
    query.set("_", Date.now().toString());

    const urlBase = `${baseUrl}/inventory`;

    try {
      let res;
      if (action === "check") {
        const url = `${urlBase}/check-availability/${encodeURIComponent(skuStr)}?${query.toString()}&quantity=${qty}`;
        res = await fetch(url, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          credentials: "include",
        });
      } else {
        let endpoint = "";
        let body: any = {};

        switch (action) {
          case "receive":
            endpoint = "receive";
            body = { sku: skuStr, quantity: qty, note: noteStr };
            break;
          case "writeoff":
            endpoint = "write-off";
            body = { sku: skuStr, quantity: qty, reason: noteStr };
            break;
          case "reserve":
            endpoint = "reserve";
            body = { items: [{ sku: skuStr, quantity: qty }] };
            break;
          case "cancel":
            endpoint = "cancel-reservation";
            body = { items: [{ sku: skuStr, quantity: qty }] };
            break;
          case "adjust":
            endpoint = "adjust";
            body = { sku: skuStr, newQuantity: newQty, reason: noteStr };
            break;
        }

        const url = `${urlBase}/${endpoint}?${query.toString()}`;
        res = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          credentials: "include",
          body: JSON.stringify(body),
        });
      }

      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({}));
        throw new Error(err?.message || `Ошибка ${res?.status}`);
      }

      setInventoryMessage("Успешно выполнено");
      setInventoryDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      setInventoryMessage(error?.message || "Ошибка операции");
    } finally {
      setInventoryLoading(null);
    }
  };

  const parseSkusInput = () =>
    bulkSkus
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const sendBulk = async (
    path: "prices" | "quantities" | "price-modifier" | "delete" | "duplicate",
    method: "PUT" | "POST" | "DELETE",
    defaultBody: any
  ) => {
    if (!currentBranch?.id || !orgData) {
      setBulkMessage("Выберите филиал и организацию");
      return;
    }
    let bodyObj: any = defaultBody;

    if (bulkPayload.trim()) {
      try {
        bodyObj = JSON.parse(bulkPayload);
      } catch (e) {
        setBulkMessage("Некорректный JSON в теле");
        return;
      }
    } else {
      const skus = parseSkusInput();
      switch (path) {
        case "prices": {
          const purchase = Number(bulkPurchasePrice);
          const selling = Number(bulkSellingPrice);
          if (!skus.length || Number.isNaN(purchase) || Number.isNaN(selling)) {
            setBulkMessage("Укажите SKU и цены");
            return;
          }
          bodyObj = { items: skus.map((sku) => ({ sku, purchasePrice: purchase, sellingPrice: selling })) };
          break;
        }
        case "quantities": {
          const qty = Number(bulkQuantity);
          if (!skus.length || Number.isNaN(qty)) {
            setBulkMessage("Укажите SKU и количество");
            return;
          }
          bodyObj = { items: skus.map((sku) => ({ sku, quantity: qty })) };
          break;
        }
        case "price-modifier": {
          const percent = Number(bulkPercent);
          if (!skus.length || Number.isNaN(percent)) {
            setBulkMessage("Укажите SKU и процент");
            return;
          }
          bodyObj = { percent, items: skus };
          break;
        }
        case "delete": {
          if (!skus.length) {
            setBulkMessage("Укажите SKU для удаления");
            return;
          }
          bodyObj = { items: skus };
          break;
        }
        case "duplicate": {
          const source = bulkSourceSku.trim() || skus[0];
          const target = bulkNewSku.trim();
          if (!source || !target) {
            setBulkMessage("Укажите исходный и новый SKU");
            return;
          }
          bodyObj = { sku: source, newSku: target };
          break;
        }
      }
    }

    setBulkLoading(path);
    setBulkMessage(null);
    const query = new URLSearchParams();
    query.set("branchId", currentBranch.id.toString());
    query.set("organizationId", orgData.toString());
    if (user?.id) query.set("userId", user.id.toString());
    query.set("_", Date.now().toString());

    const url = `${baseUrl}/bulk-operations/${path}?${query.toString()}`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        credentials: "include",
        body: method === "DELETE" ? JSON.stringify(bodyObj) : JSON.stringify(bodyObj),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Ошибка ${res.status}`);
      }
      setBulkMessage("Операция выполнена");
      fetchItems();
    } catch (error: any) {
      setBulkMessage(error?.message || "Ошибка операции");
    } finally {
      setBulkLoading(null);
    }
  };

  const categoryQuery = () => {
    const q = new URLSearchParams();
    if (!currentBranch?.id || !orgData) return null;
    q.set("branchId", currentBranch.id.toString());
    q.set("organizationId", orgData.toString());
    if (user?.id) q.set("userId", user.id.toString());
    q.set("_", Date.now().toString());
    return q;
  };

  const createCategory = async () => {
    const q = categoryQuery();
    if (!q) {
      setCategoryMessage("Выберите филиал и организацию");
      return;
    }
    if (!categoryCode || !categoryName) {
      setCategoryMessage("Код и название обязательны");
      return;
    }
    setCategoryLoading("create");
    setCategoryMessage(null);
    try {
      const res = await fetch(`${baseUrl}/category?${q.toString()}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        credentials: "include",
        body: JSON.stringify({
          code: categoryCode,
          name: categoryName,
          description: categoryDesc || undefined,
          sortOrder: categorySort ? Number(categorySort) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Ошибка ${res.status}`);
      }
      setCategoryMessage("Категория создана");
      fetchCategories(false);
    } catch (e: any) {
      setCategoryMessage(e?.message || "Ошибка создания");
    } finally {
      setCategoryLoading(null);
    }
  };

  const fetchCategories = async (includeInactive: boolean) => {
    const q = categoryQuery();
    if (!q) {
      setCategoryMessage("Выберите филиал и организацию");
      return;
    }
    if (includeInactive) q.set("includeInactive", "true");
    setCategoryLoading("list");
    setCategoryMessage(null);
    try {
      const res = await fetch(`${baseUrl}/category?${q.toString()}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    } catch (e: any) {
      setCategoryMessage(e?.message || "Ошибка загрузки категорий");
    } finally {
      setCategoryLoading(null);
    }
  };

  const fetchCategoryStats = async () => {
    const q = categoryQuery();
    if (!q) {
      setCategoryMessage("Выберите филиал и организацию");
      return;
    }
    setCategoryLoading("stats");
    setCategoryMessage(null);
    try {
      const res = await fetch(`${baseUrl}/category/stats?${q.toString()}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      setCategoryStats(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    } catch (e: any) {
      setCategoryMessage(e?.message || "Ошибка загрузки статистики");
    } finally {
      setCategoryLoading(null);
    }
  };

  const updateCategory = async () => {
    const q = categoryQuery();
    if (!q || !categoryIdInput.trim()) {
      setCategoryMessage("Укажите ID категории и выберите филиал/организацию");
      return;
    }
    setCategoryLoading("update");
    setCategoryMessage(null);
    try {
      const res = await fetch(`${baseUrl}/category/${encodeURIComponent(categoryIdInput.trim())}?${q.toString()}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        credentials: "include",
        body: JSON.stringify({
          code: categoryCode || undefined,
          name: categoryName || undefined,
          description: categoryDesc || undefined,
          sortOrder: categorySort ? Number(categorySort) : undefined,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Ошибка ${res.status}`);
      }
      setCategoryMessage("Категория обновлена");
      fetchCategories(false);
    } catch (e: any) {
      setCategoryMessage(e?.message || "Ошибка обновления");
    } finally {
      setCategoryLoading(null);
    }
  };

  const deleteCategory = async () => {
    const q = categoryQuery();
    if (!q || !categoryIdInput.trim()) {
      setCategoryMessage("Укажите ID категории");
      return;
    }
    setCategoryLoading("delete");
    setCategoryMessage(null);
    try {
      const res = await fetch(`${baseUrl}/category/${encodeURIComponent(categoryIdInput.trim())}?${q.toString()}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Ошибка ${res.status}`);
      }
      setCategoryMessage("Категория удалена");
      fetchCategories(false);
    } catch (e: any) {
      setCategoryMessage(e?.message || "Ошибка удаления");
    } finally {
      setCategoryLoading(null);
    }
  };

  const toggleCategoryActive = async (active: boolean) => {
    const q = categoryQuery();
    if (!q || !categoryIdInput.trim()) {
      setCategoryMessage("Укажите ID категории");
      return;
    }
    setCategoryLoading(active ? "activate" : "deactivate");
    setCategoryMessage(null);
    try {
      const res = await fetch(
        `${baseUrl}/category/${encodeURIComponent(categoryIdInput.trim())}/${active ? "activate" : "deactivate"}?${q.toString()}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
          credentials: "include",
        }
      );
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Ошибка ${res.status}`);
      }
      setCategoryMessage(active ? "Активирована" : "Деактивирована");
      fetchCategories(true);
    } catch (e: any) {
      setCategoryMessage(e?.message || "Ошибка операции");
    } finally {
      setCategoryLoading(null);
    }
  };

  const fetchCategoryById = async () => {
    const q = categoryQuery();
    if (!q || !categoryIdInput.trim()) {
      setCategoryMessage("Укажите ID категории");
      return;
    }
    setCategoryLoading("getId");
    setCategoryMessage(null);
    try {
      const res = await fetch(`${baseUrl}/category/${encodeURIComponent(categoryIdInput.trim())}?${q.toString()}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      setCategories([data?.data ?? data].filter(Boolean));
    } catch (e: any) {
      setCategoryMessage(e?.message || "Ошибка поиска по ID");
    } finally {
      setCategoryLoading(null);
    }
  };

  const fetchCategoryByCode = async () => {
    const q = categoryQuery();
    if (!q || !categoryCodeInput.trim()) {
      setCategoryMessage("Укажите код категории");
      return;
    }
    setCategoryLoading("getCode");
    setCategoryMessage(null);
    try {
      const res = await fetch(`${baseUrl}/category/code/${encodeURIComponent(categoryCodeInput.trim())}?${q.toString()}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      setCategories([data?.data ?? data].filter(Boolean));
    } catch (e: any) {
      setCategoryMessage(e?.message || "Ошибка поиска по коду");
    } finally {
      setCategoryLoading(null);
    }
  };


  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <WarehouseIcon className="h-6 w-6 text-emerald-600" />
              Склад
            </h1>
            <p className="text-sm text-slate-500">
              Товары, запасы, массовые операции и категории в отдельных вкладках.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "items", label: "Товары" },
              { key: "inventory", label: "Запасы" },
              { key: "bulk", label: "Массовые" },
              { key: "categories", label: "Категории" },
            ].map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                className="rounded-full px-4"
                onClick={() => setActiveTab(tab.key as any)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "items" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Поиск по названию, SKU..."
                  className="pl-9 w-64"
                />
              </div>
              <Input
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="ID или SKU товара"
                className="w-48"
              />
              <Button variant="outline" className="gap-2" onClick={fetchItemByKey}>
                Поиск ID/SKU
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => fetchItems()}>
                <Loader2 className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Обновить
              </Button>
              <Button
                variant="default"
                className="gap-2"
                onClick={() => {
                  setDialogMode("create");
                  setCreateMessage(null);
                  setNewItem({
                    name: "",
                    quantity: "",
                    unit: "",
                    purchasePrice: "",
                    sellingPrice: "",
                    categoryId: "",
                    minStockLevel: "",
                    supplier: "",
                    description: "",
                    sku: "",
                  });
                  setEditingId(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Добавить товар
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Всего позиций", value: stats.totalItems, color: "from-indigo-500 to-purple-500", icon: <Layers className="h-5 w-5" /> },
              { label: "В наличии", value: stats.inStock, color: "from-emerald-500 to-green-500", icon: <Package className="h-5 w-5" /> },
              { label: "Низкий остаток", value: stats.lowStock, color: "from-amber-500 to-orange-500", icon: <Bell className="h-5 w-5" /> },
              { label: "Стоимость, сом", value: stats.totalValue, color: "from-sky-500 to-blue-500", icon: <BarChart3 className="h-5 w-5" /> },
            ].map((card) => (
              <Card
                key={card.label}
                className="border border-slate-200 shadow-sm bg-white relative overflow-hidden"
              >
                <div className={cn("absolute top-0 inset-x-0 h-1 bg-gradient-to-r", card.color)} />
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <CardDescription className="text-slate-500">{card.label}</CardDescription>
                    <div className={cn("p-2 rounded-full text-white bg-gradient-to-br shadow-sm", card.color)}>
                      {card.icon}
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-semibold text-slate-900">{formatNumber(card.value)}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Inventory modal */}
      <Dialog open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{inventoryActionLabel(inventoryAction)}</DialogTitle>
            <DialogDescription>Введите параметры операции</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              doInventoryAction(inventoryAction);
            }}
          >
            <Input
              placeholder="SKU *"
              value={inventorySku}
              onChange={(e) => setInventorySku(e.target.value)}
              required
            />
            {(inventoryAction !== "adjust") && (
              <Input
                placeholder={inventoryAction === "check" ? "Количество для проверки *" : "Количество *"}
                type="number"
                value={inventoryQty}
                onChange={(e) => setInventoryQty(e.target.value)}
                required
              />
            )}
            {inventoryAction === "adjust" && (
              <Input
                placeholder="Новое количество *"
                type="number"
                value={inventoryNewQty}
                onChange={(e) => setInventoryNewQty(e.target.value)}
                required
              />
            )}
            <Input
              placeholder={inventoryAction === "writeoff" ? "Причина (опционально)" : "Комментарий (опционально)"}
              value={inventoryNote}
              onChange={(e) => setInventoryNote(e.target.value)}
            />
            {inventoryMessage && (
              <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                {inventoryMessage}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={closeInventoryDialog}>Отмена</Button>
              <Button type="submit" disabled={!!inventoryLoading}>
                {inventoryLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Выполнить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {activeTab === "inventory" && (
      <Card className="border-slate-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Операции с запасами</CardTitle>
          <CardDescription>Приёмка, списание, резерв, отмена резерва, корректировка, проверка наличия</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="text-sm text-slate-600">Выберите действие — поля появятся в модальном окне.</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInventoryAction("receive");
                  setInventoryDialogOpen(true);
                  setInventoryMessage(null);
                }}
              >
                Приёмка
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInventoryAction("writeoff");
                  setInventoryDialogOpen(true);
                  setInventoryMessage(null);
                }}
              >
                Списание
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInventoryAction("reserve");
                  setInventoryDialogOpen(true);
                  setInventoryMessage(null);
                }}
              >
                Резерв
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInventoryAction("cancel");
                  setInventoryDialogOpen(true);
                  setInventoryMessage(null);
                }}
              >
                Отмена резерва
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInventoryAction("adjust");
                  setInventoryDialogOpen(true);
                  setInventoryMessage(null);
                }}
              >
                Корректировка
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInventoryAction("check");
                  setInventoryDialogOpen(true);
                  setInventoryMessage(null);
                }}
              >
                Проверить наличие
              </Button>
            </div>
            {inventoryMessage && (
              <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                {inventoryMessage}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "bulk" && (
      <Card className="border-slate-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Массовые операции</CardTitle>
          <CardDescription>Обновление цен/количества, модификатор цен, удаление, дублирование</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="SKU (через запятую или с новой строки)"
              value={bulkSkus}
              onChange={(e) => setBulkSkus(e.target.value)}
            />
            <Input
              placeholder="Процент (для модификатора)"
              type="number"
              value={bulkPercent}
              onChange={(e) => setBulkPercent(e.target.value)}
            />
            <Input
              placeholder="Закуп (для обновления цен)"
              type="number"
              value={bulkPurchasePrice}
              onChange={(e) => setBulkPurchasePrice(e.target.value)}
            />
            <Input
              placeholder="Продажа (для обновления цен)"
              type="number"
              value={bulkSellingPrice}
              onChange={(e) => setBulkSellingPrice(e.target.value)}
            />
            <Input
              placeholder="Количество (для обновления количеств)"
              type="number"
              value={bulkQuantity}
              onChange={(e) => setBulkQuantity(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Исходный SKU (для дублирования)"
                value={bulkSourceSku}
                onChange={(e) => setBulkSourceSku(e.target.value)}
              />
              <Input
                placeholder="Новый SKU (для дублирования)"
                value={bulkNewSku}
                onChange={(e) => setBulkNewSku(e.target.value)}
              />
            </div>
          </div>
          <Textarea
            placeholder="Опционально: свой JSON для сложных случаев"
            value={bulkPayload}
            onChange={(e) => setBulkPayload(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={bulkLoading === "prices"}
              onClick={() =>
                sendBulk("prices", "PUT", { items: [{ sku: "SKU1", purchasePrice: 0, sellingPrice: 0 }] })
              }
            >
              {bulkLoading === "prices" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Обновить цены
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={bulkLoading === "quantities"}
              onClick={() =>
                sendBulk("quantities", "PUT", { items: [{ sku: "SKU1", quantity: 1 }] })
              }
            >
              {bulkLoading === "quantities" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Обновить количество
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={bulkLoading === "price-modifier"}
              onClick={() =>
                sendBulk("price-modifier", "POST", { percent: 10, items: ["SKU1"] })
              }
            >
              {bulkLoading === "price-modifier" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Модификатор цен
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={bulkLoading === "delete"}
              onClick={() =>
                sendBulk("delete", "DELETE", { items: ["SKU1"] })
              }
            >
              {bulkLoading === "delete" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Массовое удаление
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={bulkLoading === "duplicate"}
              onClick={() =>
                sendBulk("duplicate", "POST", { sku: "SKU1", newSku: "SKU1-copy" })
              }
            >
              {bulkLoading === "duplicate" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Дублировать
            </Button>
          </div>
          {bulkMessage && (
            <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              {bulkMessage}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {activeTab === "categories" && (
      <Card className="border-slate-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Категории склада</CardTitle>
          <CardDescription>Создание, поиск, активация/деактивация, удаление</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Код *" value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} />
            <Input placeholder="Название *" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            <Input
              placeholder="Описание"
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
            />
            <Input
              placeholder="Sort order"
              type="number"
              value={categorySort}
              onChange={(e) => setCategorySort(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="ID категории"
              value={categoryIdInput}
              onChange={(e) => setCategoryIdInput(e.target.value)}
            />
            <Input
              placeholder="Код категории (поиск)"
              value={categoryCodeInput}
              onChange={(e) => setCategoryCodeInput(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={categoryLoading === "create"} onClick={createCategory}>
                {categoryLoading === "create" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Создать
              </Button>
              <Button size="sm" variant="secondary" disabled={categoryLoading === "list"} onClick={() => fetchCategories(false)}>
                {categoryLoading === "list" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Все активные
              </Button>
              <Button size="sm" variant="secondary" disabled={categoryLoading === "list"} onClick={() => fetchCategories(true)}>
                {categoryLoading === "list" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Все (вкл. неактивные)
              </Button>
              <Button size="sm" variant="outline" disabled={categoryLoading === "stats"} onClick={fetchCategoryStats}>
                {categoryLoading === "stats" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Статистика
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={categoryLoading === "getId"} onClick={fetchCategoryById}>
              Найти по ID
            </Button>
            <Button size="sm" variant="outline" disabled={categoryLoading === "getCode"} onClick={fetchCategoryByCode}>
              Найти по коду
            </Button>
            <Button size="sm" variant="secondary" disabled={categoryLoading === "update"} onClick={updateCategory}>
              Обновить
            </Button>
            <Button size="sm" variant="secondary" disabled={categoryLoading === "activate"} onClick={() => toggleCategoryActive(true)}>
              Активировать
            </Button>
            <Button size="sm" variant="secondary" disabled={categoryLoading === "deactivate"} onClick={() => toggleCategoryActive(false)}>
              Деактивировать
            </Button>
            <Button size="sm" variant="destructive" disabled={categoryLoading === "delete"} onClick={deleteCategory}>
              Удалить
            </Button>
          </div>
          {categoryMessage && (
            <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              {categoryMessage}
            </div>
          )}
          {!!categories.length && (
            <div className="border border-slate-200 rounded-md p-3 space-y-2 max-h-64 overflow-auto">
              {categories.map((c) => (
                <div key={c.id || c.code} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold">{c.name} ({c.code})</div>
                    <div className="text-slate-500 text-xs">{c.description}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    ID: {c.id || "—"} | Активна: {c.isActive ? "Да" : "Нет"}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!!categoryStats.length && (
            <div className="border border-slate-200 rounded-md p-3 space-y-2 max-h-64 overflow-auto">
              {categoryStats.map((s) => (
                <div key={s.categoryId || s.code} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold">{s.categoryName || s.code}</div>
                    <div className="text-slate-500 text-xs">Товаров: {s.itemsCount}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Объем: {formatNumber(s.totalValue)} | Средняя: {formatNumber(s.averagePrice)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

 

      {activeTab === "items" && (
        <>
          {/* Create item modal */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{dialogMode === "edit" ? "Обновить товар" : "Добавить товар"}</DialogTitle>
                <DialogDescription>Заполните поля, обязательные отмечены *</DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  dialogMode === "edit" ? handleUpdateItem() : handleCreateItem();
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Название *"
                    value={newItem.name}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Количество *"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, quantity: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Ед. изм. *"
                    value={newItem.unit}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, unit: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Закуп, сом *"
                    type="number"
                    value={newItem.purchasePrice}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Продажа, сом *"
                    type="number"
                    value={newItem.sellingPrice}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="ID категории *"
                    value={newItem.categoryId}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, categoryId: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Мин. остаток"
                    type="number"
                    value={newItem.minStockLevel}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, minStockLevel: e.target.value }))}
                  />
                  <Input
                    placeholder="Поставщик"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, supplier: e.target.value }))}
                  />
                  <Input
                    placeholder="SKU (если есть)"
                    value={newItem.sku}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, sku: e.target.value }))}
                  />
                </div>
                <Textarea
                  placeholder="Описание"
                  value={newItem.description}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-slate-500">Обязательные поля помечены *</span>
                  <div className="flex items-center gap-3">
                    {createMessage && <span className="text-sm text-amber-700">{createMessage}</span>}
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {dialogMode === "edit" ? "Обновить товар" : "Создать товар"}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Separator />

          {/* Table */}
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Товары</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Страница {page} из {totalPages}, показано {items.length} элементов
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : items.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  Нет товаров для отображения
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="[&_th]:px-4 [&_td]:px-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Кол-во</TableHead>
                        <TableHead>Ед.</TableHead>
                        <TableHead>Закуп</TableHead>
                        <TableHead>Продажа</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="w-40">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{item.name}</span>
                              {item.description && (
                                <span className="text-xs text-slate-500 line-clamp-1">{item.description}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.sku || "—"}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit || "—"}</TableCell>
                          <TableCell>{item.purchasePrice !== undefined ? formatNumber(item.purchasePrice) : "—"}</TableCell>
                          <TableCell>{item.sellingPrice !== undefined ? formatNumber(item.sellingPrice) : "—"}</TableCell>
                          <TableCell>
                            {lowStock(item) ? (
                              <Badge variant="destructive" className="text-xs">
                                Мало
                              </Badge>
                            ) : item.quantity === 0 ? (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                                Нет в наличии
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                В наличии
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-red-600 hover:text-red-700"
                              disabled={deletingId === item.id}
                              onClick={() => handleDelete(item.id)}
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <div className="p-4 flex items-center justify-between">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Назад
              </Button>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                Стр. {page}
                <ArrowRight className="h-4 w-4 text-slate-400" />
                {Math.min(totalPages, page + 1)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages || items.length < limit}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </Button>
            </div>
          </Card>

          {items.some(lowStock) && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="h-5 w-5" />
              <span>Есть товары с низким остатком — рассмотрите заказ поставки или корректировку.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
