import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Plus, History, Menu, Home, ShieldAlert, Image } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
    icon: Home,
  },
  {
    title: "Leaderboard",
    url: createPageUrl("Leaderboard"),
    icon: Trophy,
  },
  {
    title: "Game History",
    url: createPageUrl("GameHistory"),
    icon: History,
  },
  {
    title: "Winners Gallery",
    url: createPageUrl("WinnersGallery"),
    icon: Image,
  },
  {
    title: "Director",
    url: createPageUrl("DirectorDashboard"),
    icon: ShieldAlert,
  },
];

function LayoutInner({ children }) {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  return (
      <style>{`
        :root {
          --background: 220 13% 9%;
          --foreground: 60 5% 90%;
          --primary: 45 100% 51%;
          --primary-foreground: 0 0% 0%;
          --card: 220 13% 12%;
          --card-foreground: 60 5% 90%;
          --border: 220 13% 20%;
          --accent: 142 76% 36%;
        }
        .felt-bg {
          background-color: #1f4d18;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='1' cy='1' r='0.6' fill='%23ffffff08'/%3E%3Ccircle cx='3' cy='3' r='0.6' fill='%23ffffff05'/%3E%3C/svg%3E"),
            radial-gradient(ellipse at center, %232d5a27 0%25, %231a3d15 50%25, %230f2a0a 100%25);
        }
      `}</style>
      <div className="min-h-screen flex w-full text-gray-100" style={{background: "radial-gradient(ellipse at center, #2d5a27 0%, #1a3d15 50%, #0f2a0a 100%)"}}>
        <Sidebar className="border-r border-green-900/60 bg-[#1a3d15]/90" style={{backdropFilter: "blur(4px)"}}>
          <SidebarHeader className="border-b border-gray-800 p-6">
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/44bb87bed_riverratslogo_black1PDF.pdf"
                alt="River Rat Rounders"
                className="w-12 h-12 rounded-lg object-cover"
                onError={(e) => { e.target.style.display='none'; }}
              />
              <div>
                <h2 className="font-bold text-xl text-white">River Rat Rounders</h2>
                <p className="text-xs text-gray-400">Community Rankings</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-gray-800 transition-all duration-200 rounded-lg mb-2 ${
                          location.pathname === item.url 
                            ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border-l-2 border-amber-500' 
                            : 'text-gray-400'
                        }`}
                      >
                        <Link to={item.url} onClick={() => setOpenMobile(false)} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-[#1a3d15]/90 border-b border-green-900/60 px-6 py-4 lg:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-800 p-2 rounded-lg transition-colors">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-bold text-white">River Rat Rounders</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}