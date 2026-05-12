"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR, { mutate } from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Archive,
  FileText,
  Plus,
  Search,
  Trash2,
  Download,
  FileIcon,
} from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FilingPage() {
  const { data: session } = useSession();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: documents = [], isLoading } = useSWR("/api/filing", fetcher);

  const [newFile, setNewFile] = useState({
    title: "",
    category: "General",
    fileUrl: "",
    description: "",
    tags: "",
  });

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/filing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newFile,
          fileType: "application/pdf", // Mocking for now
          fileSize: 1024 * 1024, // Mocking 1MB
          tags: newFile.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== ""),
        }),
      });

      if (res.ok) {
        toast.success("Document filed successfully");
        setIsAddOpen(false);
        setNewFile({
          title: "",
          category: "General",
          fileUrl: "",
          description: "",
          tags: "",
        });
        mutate("/api/filing");
      } else {
        toast.error("Failed to file document");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/filing?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Document deleted");
        mutate("/api/filing");
      } else {
        toast.error("Failed to delete document");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const filteredDocuments = documents.filter((doc: any) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "General",
    "Donation",
    "Voucher",
    "Legal",
    "Financial",
    "Festival",
    "Inventory",
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Archive className="w-8 h-8 text-blue-600" />
            Document Filing
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and organize trust documents and records
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              File New Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleAddFile}>
              <DialogHeader>
                <DialogTitle>File New Document</DialogTitle>
                <DialogDescription>
                  Enter details for the document you want to file.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Document Title
                  </label>
                  <Input
                    id="title"
                    required
                    value={newFile.title}
                    onChange={(e) =>
                      setNewFile({ ...newFile, title: e.target.value })
                    }
                    placeholder="e.g. Annual Audit Report 2024"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="category" className="text-sm font-medium">
                    Category
                  </label>
                  <Select
                    value={newFile.category}
                    onValueChange={(v) =>
                      setNewFile({ ...newFile, category: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="fileUrl" className="text-sm font-medium">
                    File URL (Mock Upload)
                  </label>
                  <Input
                    id="fileUrl"
                    required
                    value={newFile.fileUrl}
                    onChange={(e) =>
                      setNewFile({ ...newFile, fileUrl: e.target.value })
                    }
                    placeholder="https://example.com/document.pdf"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Input
                    id="description"
                    value={newFile.description}
                    onChange={(e) =>
                      setNewFile({ ...newFile, description: e.target.value })
                    }
                    placeholder="Brief description of the document"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="tags" className="text-sm font-medium">
                    Tags (comma separated)
                  </label>
                  <Input
                    id="tags"
                    value={newFile.tags}
                    onChange={(e) =>
                      setNewFile({ ...newFile, tags: e.target.value })
                    }
                    placeholder="audit, 2024, finance"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">File Document</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <div className="flex items-center gap-2 w-1/2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search documents..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Filed By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-gray-500"
                    >
                      Loading documents...
                    </TableCell>
                  </TableRow>
                ) : filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-gray-500"
                    >
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{doc.title}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                              {doc.description || "No description"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50">
                          {doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{doc.uploader?.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Download"
                          >
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Storage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Documents</span>
                  <span className="font-bold">{documents.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Used Storage</span>
                  <span className="font-bold">~15.4 MB</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Quota</span>
                    <span>1.5% of 1GB</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: "1.5%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  new Set(documents.flatMap((d: any) => d.tags || [])),
                )
                  .slice(0, 10)
                  .map((tag: any) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-gray-200"
                    >
                      #{tag}
                    </Badge>
                  ))}
                {documents.length === 0 && (
                  <span className="text-sm text-gray-500">No tags yet</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
