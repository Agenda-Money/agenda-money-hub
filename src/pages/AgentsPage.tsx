import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Agent {
  id: string;
  name: string;
  email: string;
  nodeCode: string;
  status: "active" | "inactive";
  location: string;
  totalTransactions: number;
  signUpsAllTime: number;
  signUpsThisMonth: number;
  loansActive: number;
  loansPending: number;
  loansClosed: number;
  loansOverdue: number;
}

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "Kwame Mensah",
    email: "kwame.mensah@example.com",
    nodeCode: "ACC-001",
    status: "active",
    location: "Accra, Greater Accra",
    totalTransactions: 1250,
    signUpsAllTime: 156,
    signUpsThisMonth: 12,
    loansActive: 45,
    loansPending: 8,
    loansClosed: 320,
    loansOverdue: 2,
  },
  {
    id: "2",
    name: "Abena Osei",
    email: "abena.osei@example.com",
    nodeCode: "KUM-045",
    status: "active",
    location: "Kumasi, Ashanti",
    totalTransactions: 980,
    signUpsAllTime: 98,
    signUpsThisMonth: 8,
    loansActive: 28,
    loansPending: 5,
    loansClosed: 180,
    loansOverdue: 1,
  },
  {
    id: "3",
    name: "Emmanuel Boateng",
    email: "emmanuel.b@example.com",
    nodeCode: "TAM-012",
    status: "inactive",
    location: "Tamale, Northern",
    totalTransactions: 450,
    signUpsAllTime: 45,
    signUpsThisMonth: 0,
    loansActive: 0,
    loansPending: 0,
    loansClosed: 120,
    loansOverdue: 5,
  },
  {
    id: "4",
    name: "Sarah Addo",
    email: "sarah.addo@example.com",
    nodeCode: "TAK-089",
    status: "active",
    location: "Takoradi, Western",
    totalTransactions: 2100,
    signUpsAllTime: 245,
    signUpsThisMonth: 22,
    loansActive: 85,
    loansPending: 15,
    loansClosed: 890,
    loansOverdue: 4,
  },
  {
    id: "5",
    name: "Kofi Owusu",
    email: "kofi.owusu@example.com",
    nodeCode: "CAP-023",
    status: "active",
    location: "Cape Coast, Central",
    totalTransactions: 875,
    signUpsAllTime: 82,
    signUpsThisMonth: 5,
    loansActive: 22,
    loansPending: 3,
    loansClosed: 145,
    loansOverdue: 0,
  },
];

export default function AgentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const filteredAgents = mockAgents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.nodeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agents</h1>
          <p className="text-muted-foreground mt-1">
            Manage your agent network and view performance
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Agents</CardTitle>
                <CardDescription>
                  List of registered agents and their node codes
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Name</TableHead>
                    <TableHead>Node Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow 
                      key={agent.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          {agent.name}
                          <div className="text-xs text-muted-foreground">
                            {agent.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {agent.nodeCode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={agent.status === "active" ? "default" : "secondary"}
                          className={
                            agent.status === "active"
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-gray-500 hover:bg-gray-600"
                          }
                        >
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{agent.location}</TableCell>
                      <TableCell className="text-right">
                        {agent.totalTransactions.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>


        <Dialog open={!!selectedAgent} onOpenChange={(open) => !open && setSelectedAgent(null)}>
          <DialogContent className="sm:max-w-[700px]">
            {selectedAgent && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedAgent.name}
                    <Badge variant="outline" className="ml-2 font-mono">
                      {selectedAgent.nodeCode}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    {selectedAgent.location} • {selectedAgent.email}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Sign Ups Card */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserPlus className="h-4 w-4" />
                        <span className="text-sm font-medium">All Time Signups</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAgent.signUpsAllTime}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                         <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">This Month</span>
                      </div>
                       <p className="text-2xl font-bold">{selectedAgent.signUpsThisMonth}</p>
                    </div>
                  </div>

                  {/* Loan Portfolio */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Loan Portfolio Breakdown
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                       <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Active</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{selectedAgent.loansActive}</p>
                       </div>
                       <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900">
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Pending</p>
                          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{selectedAgent.loansPending}</p>
                       </div>
                       <div className="p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900">
                           <div className="flex items-center gap-1 mb-1">
                             <CheckCircle2 className="h-3 w-3 text-green-600" />
                             <p className="text-xs text-green-600 dark:text-green-400 font-medium">Closed</p>
                           </div>
                          <p className="text-xl font-bold text-green-700 dark:text-green-300">{selectedAgent.loansClosed}</p>
                       </div>
                       <div className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900">
                           <div className="flex items-center gap-1 mb-1">
                             <AlertCircle className="h-3 w-3 text-red-600" />
                             <p className="text-xs text-red-600 dark:text-red-400 font-medium">Overdue</p>
                           </div>
                          <p className="text-xl font-bold text-red-700 dark:text-red-300">{selectedAgent.loansOverdue}</p>
                       </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
