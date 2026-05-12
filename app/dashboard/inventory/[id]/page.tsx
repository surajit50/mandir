"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Plus,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface InventoryMovement {
  id: string;
  movementDate: string;
  movementType: string;
  quantity: number;
  remarks?: string;
  movedBy: string;
}

interface InventoryItemDetail {
  id: string;
  itemCode: string;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  category: { categoryName: string };
  movements: InventoryMovement[];
}

export default function InventoryItemDetailPage() {
  const params = useParams();
  const itemId = params.id as string;

  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItem();
  }, [itemId]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/${itemId}`);
      if (!res.ok) throw new Error("Failed to fetch item details");
      const data = await res.json();
      setItem(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching item");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );

  if (error || !item)
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error || "Item not found"}</p>
        <Link href="/dashboard/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
    );

  const isLowStock = item.quantity <= item.reorderLevel;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/inventory">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{item.itemName}</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <Badge variant="outline">{item.itemCode}</Badge>
              <span className="text-sm font-medium">
                {item.category.categoryName}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Update Stock</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Record Movement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={isLowStock ? "border-orange-200 bg-orange-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              Current Stock
              {isLowStock && (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${isLowStock ? "text-orange-600" : ""}`}
            >
              {item.quantity} {item.unit}
            </div>
            {isLowStock && (
              <p className="text-xs text-orange-600 mt-1">
                Below reorder level ({item.reorderLevel})
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Unit Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{item.unitCost.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{(item.quantity * item.unitCost).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Last Movement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {item.movements[0]
                ? new Date(item.movements[0].movementDate).toLocaleDateString()
                : "No history"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
          <CardDescription>Stock in/out logs for this item</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.movements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-10 text-gray-500"
                  >
                    No movement history found
                  </TableCell>
                </TableRow>
              ) : (
                item.movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {new Date(m.movementDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.movementType === "In"
                            ? "success"
                            : m.movementType === "Out"
                              ? "destructive"
                              : ("secondary" as any)
                        }
                      >
                        {m.movementType}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${m.movementType === "In" ? "text-green-600" : "text-red-600"}`}
                    >
                      {m.movementType === "In" ? "+" : "-"}
                      {m.quantity}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {m.remarks || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
