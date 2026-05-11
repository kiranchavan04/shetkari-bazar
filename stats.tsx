import { useGetStatsByCrop } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { getCropDisplay } from "@/lib/constants";
import Layout from "@/components/layout";

export default function Stats() {
  const { data: stats, isLoading, isError } = useGetStatsByCrop({
    query: { queryKey: ["statsByCrop"] }
  });

  const chartData = stats?.map(stat => ({
    name: getCropDisplay(stat.crop).split(" / ")[0],
    fullName: getCropDisplay(stat.crop),
    count: stat.count,
    avgPrice: parseFloat(stat.avgPrice.toFixed(2)),
    totalKg: stat.totalQuantityKg
  })) || [];

  return (
    <Layout>
      <div className="p-4 md:p-8 flex-1 max-w-7xl mx-auto w-full space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-serif text-foreground">Market Intelligence</h1>
          <p className="text-muted-foreground mt-2 text-lg">Current trends across all listed produce</p>
        </header>

        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        ) : isError ? (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 text-center text-destructive">
              Failed to load market stats. Please try again later.
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-serif">Average Price by Crop (₹/Kg)</CardTitle>
                <CardDescription>Compare current market rates</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <RechartsTooltip 
                      cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [`₹${value}`, 'Avg Price']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="avgPrice" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-serif">Total Volume Available (Kg)</CardTitle>
                <CardDescription>Supply levels across the market</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                    <RechartsTooltip 
                      cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [`${value} kg`, 'Volume']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="totalKg" radius={[4, 4, 0, 0]}>
                       {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(var(--secondary))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
