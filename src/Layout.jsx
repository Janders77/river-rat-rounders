import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Plus, History, Menu } from "lucide-react";
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
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Leaderboard",
    url: createPageUrl("Leaderboard"),
    icon: Trophy,
  },
  {
    title: "Record Game",
    url: createPageUrl("RecordGame"),
    icon: Plus,
  },
  {
    title: "Game History",
    url: createPageUrl("GameHistory"),
    icon: History,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  return (
    <SidebarProvider>
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
      `}</style>
      <div className="min-h-screen flex w-full bg-[#16171B] text-gray-100">
        <Sidebar className="border-r border-gray-800 bg-[#1A1B20]">
          <SidebarHeader className="border-b border-gray-800 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
                <Trophy className="w-6 h-6 text-gray-900" />
              </div>
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
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
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
          <header className="bg-[#1A1B20] border-b border-gray-800 px-6 py-4 lg:hidden">
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