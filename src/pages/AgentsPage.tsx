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
import { Search } from "lucide-react";
import { useState } from "react";

interface Agent {
  id: string;
  name: string;
  email: string;
  nodeCode: string;
  status: "active" | "inactive";
  location: string;
  totalTransactions: number;
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
  },
  {
    id: "2",
    name: "Abena Osei",
    email: "abena.osei@example.com",
    nodeCode: "KUM-045",
    status: "active",
    location: "Kumasi, Ashanti",
    totalTransactions: 980,
  },
  {
    id: "3",
    name: "Emmanuel Boateng",
    email: "emmanuel.b@example.com",
    nodeCode: "TAM-012",
    status: "inactive",
    location: "Tamale, Northern",
    totalTransactions: 450,
  },
  {
    id: "4",
    name: "Sarah Addo",
    email: "sarah.addo@example.com",
    nodeCode: "TAK-089",
    status: "active",
    location: "Takoradi, Western",
    totalTransactions: 2100,
  },
  {
    id: "5",
    name: "Kofi Owusu",
    email: "kofi.owusu@example.com",
    nodeCode: "CAP-023",
    status: "active",
    location: "Cape Coast, Central",
    totalTransactions: 875,
  },
];

export default function AgentsPage() {
  const [searchTerm, setSearchTerm] = useState("");

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Agents</CardTitle>
                <CardDescription>
                  List of registered agents and their node codes
                </CardDescription>
              </div>
              <div className="relative w-64">
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
            <Table>
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
                  <TableRow key={agent.id}>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
