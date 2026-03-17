import { useState } from "react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import { FileText, Folder, Upload, Search, Filter, MoreVertical, Star, Clock, Share2, Trash2, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Initial Mock data
const INITIAL_FOLDERS = [
  { id: "f-1", name: "Finance", items: 5, parentId: null },
  { id: "f-2", name: "Engineering", items: 12, parentId: null },
  { id: "f-3", name: "Human Resources", items: 3, parentId: null },
  { id: "f-4", name: "Projects", items: 8, parentId: null },
];

const INITIAL_DOCUMENTS = [
  {
    id: "doc-1",
    name: "Q1 Financial Report.pdf",
    type: "pdf",
    size: "2.4 MB",
    updatedAt: "2 hours ago",
    owner: "Sarah Jenkins",
    starred: true,
    folderId: "f-1"
  },
  {
    id: "doc-2",
    name: "Project Alpha Blueprint.dwg",
    type: "cad",
    size: "15.8 MB",
    updatedAt: "1 day ago",
    owner: "Mike Ross",
    starred: false,
    folderId: "f-4"
  },
  {
    id: "doc-3",
    name: "Employee Handbook 2024.docx",
    type: "word",
    size: "1.1 MB",
    updatedAt: "3 days ago",
    owner: "HR Department",
    starred: true,
    folderId: "f-3"
  },
  {
    id: "doc-4",
    name: "Site Safety Guidelines.pdf",
    type: "pdf",
    size: "4.5 MB",
    updatedAt: "1 week ago",
    owner: "Safety Team",
    starred: false,
    folderId: "f-2"
  },
  {
    id: "doc-5",
    name: "Vendor Contracts.xlsx",
    type: "excel",
    size: "850 KB",
    updatedAt: "2 weeks ago",
    owner: "Finance",
    starred: false,
    folderId: "f-1"
  },
];

export default function DocumentManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");

  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
  const displayFolders = folders.filter(f => f.parentId === currentFolderId);
  const displayDocuments = documents.filter(d => 
    (activeTab === "all" ? d.folderId === currentFolderId : true) &&
    (activeTab === "starred" ? d.starred : true) &&
    (searchQuery ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
  );

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-8 w-8 text-red-500" />;
      case "word":
        return <FileText className="h-8 w-8 text-blue-500" />;
      case "excel":
        return <FileText className="h-8 w-8 text-green-500" />;
      case "cad":
        return <FileText className="h-8 w-8 text-purple-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder = {
      id: `f-${Date.now()}`,
      name: newFolderName,
      items: 0,
      parentId: currentFolderId
    };
    
    setFolders([...folders, newFolder]);
    setNewFolderName("");
    setIsNewFolderDialogOpen(false);
    toast({
      title: "Folder Created",
      description: `Folder "${newFolderName}" has been created successfully.`,
    });
  };

  const handleUploadFile = () => {
    if (!uploadFileName.trim()) return;
    
    const ext = uploadFileName.split('.').pop()?.toLowerCase() || 'txt';
    let type = "txt";
    if (ext === 'pdf') type = 'pdf';
    else if (ext === 'doc' || ext === 'docx') type = 'word';
    else if (ext === 'xls' || ext === 'xlsx') type = 'excel';
    else if (ext === 'dwg') type = 'cad';

    const newDoc = {
      id: `doc-${Date.now()}`,
      name: uploadFileName.includes('.') ? uploadFileName : `${uploadFileName}.pdf`,
      type,
      size: "1.0 MB",
      updatedAt: "Just now",
      owner: "Current User",
      starred: false,
      folderId: currentFolderId
    };
    
    setDocuments([newDoc, ...documents]);
    
    if (currentFolderId) {
      setFolders(folders.map(f => 
        f.id === currentFolderId ? { ...f, items: f.items + 1 } : f
      ));
    }
    
    setUploadFileName("");
    setIsUploadDialogOpen(false);
    toast({
      title: "File Uploaded",
      description: `File "${newDoc.name}" has been uploaded successfully.`,
    });
  };

  return (
    <ModuleLayout
      title="Document Management"
      subtitle="Centralized document storage and access control"
    >
      <div className="flex flex-col gap-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documents..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload File</DialogTitle>
                  <DialogDescription>
                    Add a new document to the current folder.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fileName">File Name</Label>
                    <Input 
                      id="fileName" 
                      placeholder="e.g. Contract.pdf" 
                      value={uploadFileName}
                      onChange={(e) => setUploadFileName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleUploadFile}>Upload</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>
                    Create a new folder to organize your documents.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="folderName">Folder Name</Label>
                    <Input 
                      id="folderName" 
                      placeholder="Enter folder name" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateFolder}>Create Folder</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button 
            variant={activeTab === "all" ? "default" : "outline"} 
            onClick={() => { setActiveTab("all"); setCurrentFolderId(null); }}
            className="rounded-full"
          >
            All Files
          </Button>
          <Button 
            variant={activeTab === "starred" ? "default" : "outline"} 
            onClick={() => setActiveTab("starred")}
            className="rounded-full"
          >
            <Star className="h-4 w-4 mr-2" />
            Starred
          </Button>
        </div>

        {/* Current Path */}
        {currentFolderId && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={() => setCurrentFolderId(null)} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Root
            </Button>
            <span>/</span>
            <span className="font-medium text-foreground">{currentFolder?.name}</span>
          </div>
        )}

        {/* Folders Section */}
        {displayFolders.length > 0 && activeTab === "all" && (
          <div>
            <h3 className="text-lg font-medium mb-4">Folders</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {displayFolders.map((folder) => (
                <Card 
                  key={folder.id} 
                  className="cursor-pointer hover:border-primary hover:shadow-sm transition-all"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Folder className="h-6 w-6 text-primary fill-primary/20" />
                    </div>
                    <div>
                      <h4 className="font-medium">{folder.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {documents.filter(d => d.folderId === folder.id).length} items
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">
            {activeTab === "starred" ? "Starred Documents" : "Documents"}
          </h3>
          {displayDocuments.length > 0 ? (
            <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
              <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
                <div className="col-span-6 sm:col-span-5">Name</div>
                <div className="hidden sm:block col-span-3">Owner</div>
                <div className="col-span-3 sm:col-span-2">Modified</div>
                <div className="hidden sm:block col-span-1">Size</div>
                <div className="col-span-3 sm:col-span-1 text-right">Actions</div>
              </div>
              
              <div className="divide-y">
                {displayDocuments.map((doc) => (
                  <div key={doc.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group">
                    <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                      {getFileIcon(doc.type)}
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-1 sm:hidden">
                          <span className="text-xs text-muted-foreground">{doc.size}</span>
                          <span className="text-xs text-muted-foreground">• {doc.updatedAt}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="hidden sm:flex col-span-3 items-center">
                      <Badge variant="secondary" className="font-normal">{doc.owner}</Badge>
                    </div>
                    
                    <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground">
                      {doc.updatedAt}
                    </div>
                    
                    <div className="hidden sm:block col-span-1 text-sm text-muted-foreground">
                      {doc.size}
                    </div>
                    
                    <div className="col-span-3 sm:col-span-1 flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setDocuments(documents.map(d => d.id === doc.id ? {...d, starred: !d.starred} : d));
                        }}
                      >
                        <Star className={`h-4 w-4 ${doc.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity'}`} />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" /> Share
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => {
                            setDocuments(documents.filter(d => d.id !== doc.id));
                            toast({ description: "Document deleted" });
                          }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg border-dashed bg-muted/10">
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">No documents found in this folder.</p>
              <Button variant="link" onClick={() => setIsUploadDialogOpen(true)} className="mt-2">
                Upload your first file
              </Button>
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}