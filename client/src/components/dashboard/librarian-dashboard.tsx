import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, BookPlus, RotateCcw, UserCheck,
  Clock, AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import StatsCard from "@/components/stats/stats-card";
import BookTable from "@/components/book/book-table";
import NotificationList from "@/components/notification/notification-list";

const LibrarianDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [bookCount, setBookCount] = useState<number | null>(null);

  // // Fetch all books
  // const { data: books } = useQuery({
  //   queryKey: ["/alluser/get-all-books"],
  //   enabled: !!user && user.role === "librarian"
  // });

  const {  data: books, isLoading: isBooksLoading, error: booksError  } = useQuery({
    queryKey: ["/alluser/get-all-books"],
    // enabled: !!user && user.role.toLowerCase() === "librarian",
    enabled: true,
    queryFn: async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No authorization token found");
        console.log("Fetching books with token:", token); // Debugging line
        const response = await fetch("http://127.0.0.1:8080/alluser/get-all-books/12", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
    
        // console.log("Response status:", response.status);
        const data = await response.json();
        if (response.statusCode !== 200) {
          throw new Error(data.message || "Failed to fetch books");
        }
        
        return data.content;
      } catch (error) {
        console.error("Query error:", error);
        throw error; // rethrow for react-query to catch
      }
    },
  });

  useEffect(() => {
    const fetchBookCount = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch('http://127.0.0.1:8080/alluser/get-total-books', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setBookCount(data); // Assuming the response contains totalBooks
      } catch (error) {
        setBookCount(null); // Or you can set to 0 if you prefer
      }
    };
  
    fetchBookCount();
  }, []);
  

  // Fetch active borrowings
  async function fetchIssuedBooks(): Promise<Borrow[]> {
    const res = await fetch(
      "http://127.0.0.1:8080/librarian/get-issued-books",
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error ${res.status}: ${txt}`);
    }
    return res.json();
  }

  // 3. React-Query hook (only for librarians)
  const {
    data: activeBorrowings,
    isLoading: isLoadingActive,
    error: activeError,
  } = useQuery<Borrow[]>({
    queryKey: ["/api/borrowings/active"],
    queryFn: fetchIssuedBooks,
    enabled: user?.role === "librarian",
    retry: 1,
  });


  // Fetch overdue borrowings
// 1. Auth header helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    if (!token) throw new Error("No auth token found");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // 2. Fetcher for overdue books
  async function fetchOverdueBooks(): Promise<Borrow[]> {
    const res = await fetch(
      "http://127.0.0.1:8080/librarian/get-overdue-books",
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Error ${res.status}: ${text}`);
    }

    console.log("Overdue books response:", res); // Debugging line

    return res.json();
  }

  // 3. React-Query hook (only enabled for librarians)
  const { 
    data: overdueBorrowings, 
    isLoading: isLoadingOverdue, 
    error: overdueError 
  } = useQuery<Borrow[]>({
    queryKey: ["/api/borrowings/overdue"],
    queryFn: fetchOverdueBooks,
    enabled: user?.role === "librarian",  // only fetch if the user is a librarian
    retry: 1,
  });

  // Fetch book requests
  const { data: bookRequests } = useQuery({
    queryKey: ["/api/book-requests"],
    enabled: !!user && user.role === "librarian"
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Librarian Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Welcome back, {user?.name}! Here's an overview of library activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard 
          title="Total Books"
          // value={books?.length || 0}
          value={bookCount !== null ? bookCount : "—"} // Shows placeholder until loaded
          icon={<BookOpen className="h-5 w-5" />}
          description="In the library collection"
          className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        
        <StatsCard 
          title="Books Borrowed"
          value={activeBorrowings?.length || 0}
          icon={<BookPlus className="h-5 w-5" />}
          description="Currently checked out"
          className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
        
        <StatsCard 
          title="Overdue Books"
          value={overdueBorrowings?.length || 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          description="Past the due date"
          className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="overview">Quick Actions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/librarian/books" className="w-full">
                    <div className="h-24 flex flex-col items-center justify-center gap-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 w-full">
                      <BookOpen className="h-5 w-5" />
                      <span>Manage Books</span>
                    </div>
                  </Link>
                  <Link href="/librarian/issue" className="w-full">
                    <div className="h-24 flex flex-col items-center justify-center gap-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 w-full">
                      <BookPlus className="h-5 w-5" />
                      <span>Issue Books</span>
                    </div>
                  </Link>
                  <Link href="/librarian/return" className="w-full col-span-2">
                    <div className="h-24 flex flex-col items-center justify-center gap-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 w-full">
                      <RotateCcw className="h-5 w-5" />
                      <span>Return Books</span>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Overdue Books</h3>
                  <Link href="/librarian/return" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3">
                    View All
                  </Link>
                </div>
                <div className="space-y-4">
                  {overdueBorrowings?.slice(0, 3).map((borrowing) => (
                    <div key={borrowing.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-medium">{borrowing.book?.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Borrowed by: {borrowing.user} • 
                          Due: {new Date(borrowing.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {(!overdueBorrowings || overdueBorrowings.length === 0) && (
                    <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
                      No overdue books at the moment
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardContent className="pt-6">
              <NotificationList notifications={notifications || []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default LibrarianDashboard;
