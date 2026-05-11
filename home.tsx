import { useState } from "react";
import { useListListings, useGetMarketSummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCropDisplay, getGradeDisplay, CROPS, GRADES } from "@/lib/constants";
import { MapPin, IndianRupee, Scale, TrendingUp, Users, Package, Sprout } from "lucide-react";
import Layout from "@/components/layout";

export default function Home() {
  const [filterCrop, setFilterCrop] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  const queryParams = {
    ...(filterCrop !== "all" && { crop: filterCrop }),
    ...(filterGrade !== "all" && { grade: filterGrade }),
  };

  const { data: listings, isLoading: loadingListings } = useListListings(queryParams, {
    query: {
      queryKey: ["listings", filterCrop, filterGrade]
    }
  });

  const { data: summary, isLoading: loadingSummary } = useGetMarketSummary({
    query: { queryKey: ["summary"] }
  });

  return (
    <Layout>
      <div className="p-4 md:p-8 flex-1 max-w-7xl mx-auto w-full">
        {/* Market Summary Banner */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 font-serif text-foreground">Market Overview</h2>
          {loadingSummary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard title="Total Listings" value={summary.totalListings} icon={Package} />
              <SummaryCard title="Active Farmers" value={summary.totalFarmers} icon={Users} />
              <SummaryCard title="Avg Price / Kg" value={`₹${summary.avgPricePerKg?.toFixed(2) || 0}`} icon={IndianRupee} />
              <SummaryCard title="Top Crop" value={getCropDisplay(summary.topCrop)} icon={TrendingUp} />
            </div>
          ) : null}
        </section>

        {/* Filters & Listings */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold font-serif text-foreground">Live Produce</h2>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={filterCrop} onValueChange={setFilterCrop}>
                <SelectTrigger className="w-full md:w-[180px] bg-card border-border" data-testid="filter-crop">
                  <SelectValue placeholder="All Crops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Crops</SelectItem>
                  {CROPS.map(c => (
                    <SelectItem key={c} value={c}>{getCropDisplay(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="w-full md:w-[180px] bg-card border-border" data-testid="filter-grade">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {GRADES.map(g => (
                    <SelectItem key={g} value={g}>{getGradeDisplay(g)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingListings ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
            </div>
          ) : listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow border-border/60" data-testid={`card-listing-${listing.id}`}>
                  <CardHeader className="bg-primary/5 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="secondary" className="mb-2 bg-secondary text-secondary-foreground">
                          {getCropDisplay(listing.crop)}
                        </Badge>
                        <CardTitle className="text-xl text-foreground font-serif">{listing.farmerName}</CardTitle>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary">₹{listing.pricePerKg}</span>
                        <span className="text-muted-foreground text-sm block">/ kg</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center text-muted-foreground gap-2">
                        <MapPin className="w-4 h-4 text-secondary" />
                        <span className="text-foreground">{listing.village}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground gap-2">
                        <Scale className="w-4 h-4 text-secondary" />
                        <span className="text-foreground">{listing.quantityKg} kg available</span>
                      </div>
                      <div className="flex items-center text-muted-foreground gap-2">
                        <Package className="w-4 h-4 text-secondary" />
                        <span className="text-foreground">Grade: {getGradeDisplay(listing.grade)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium" data-testid={`button-view-${listing.id}`}>
                      <Link href={`/listings/${listing.id}`}>View Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border" data-testid="empty-state">
              <Sprout className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-foreground mb-2">No produce found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters or check back later.</p>
              <Button variant="outline" onClick={() => { setFilterCrop("all"); setFilterGrade("all"); }}>
                Clear Filters
              </Button>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function SummaryCard({ title, value, icon: Icon }: { title: string, value: string | number, icon: any }) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4 md:p-6 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
