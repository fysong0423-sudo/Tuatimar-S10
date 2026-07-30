import type { Metadata } from "next";
import Dashboard from "./dashboard";

export const metadata: Metadata = {
  title: "Northstar · Amazon US 运营监控",
  description: "美国亚马逊关键词排名与 BSR 日变化监控看板",
};

export default function Home() {
  return <Dashboard />;
}
