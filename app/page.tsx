"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ExternalLink,
  ArrowUp,
  MessageCircle,
  RefreshCw,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  CalendarIcon,
} from "lucide-react"
import { format } from "date-fns"

type Sentiment = "positive" | "neutral" | "negative"
type Category =
  | "All"
  | "Lenovo Yoga Series"
  | "Lenovo ThinkPad Series"
  | "Lenovo Audio"
  | "Smart Home"
  | "Accessories"
  | "General"

interface Review {
  id: number
  title: string
  summary: string
  category: Category
  sentiment: Sentiment
  upvotes: number
  comments: number
  redditUrl: string
  createdAt: string
  isQuestion: boolean
}

interface LiveMetrics {
  newReviews: number
  positiveReviews: number
  negativeReviews: number
  unansweredQuestions: number
}

const categories: Category[] = [
  "All",
  "Lenovo Yoga Series",
  "Lenovo ThinkPad Series",
  "Lenovo Audio",
  "Smart Home",
  "Accessories",
  "General",
]

const quickFilters = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "Last 7 Days", days: 7 },
  { label: "This Month", days: 30 },
]

export default function LenovoReviewsDashboard() {
  const [activeCategory, setActiveCategory] = useState<Category>("All")
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [activeFilter, setActiveFilter] = useState<string>("Today")

  const fetchReviews = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("[v0] Fetching reviews from API...")

      const response = await fetch("/api/reddit")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to fetch reviews")
      }

      const data = await response.json()
      console.log("[v0] Received reviews:", data.reviews.length)

      const enhancedReviews = data.reviews.map((review: any) => ({
        ...review,
        createdAt: review.createdAt || new Date().toISOString(),
        isQuestion: detectQuestion(review.title, review.summary),
      }))

      setReviews(enhancedReviews)
    } catch (err) {
      console.error("[v0] Error fetching reviews:", err)
      setError(err instanceof Error ? err.message : "Failed to load reviews")
    } finally {
      setLoading(false)
    }
  }

  const detectQuestion = (title: string, summary: string): boolean => {
    const questionKeywords = ["help", "how to", "why", "issue", "problem", "troubleshoot", "anyone know"]
    const text = `${title} ${summary}`.toLowerCase()

    return (
      title.includes("?") || questionKeywords.some((keyword) => text.includes(keyword)) || text.includes("question")
    )
  }

  const getFilteredReviews = () => {
    let filtered = activeCategory === "All" ? reviews : reviews.filter((review) => review.category === activeCategory)

    if (activeFilter !== "Today") {
      const today = new Date()
      today.setHours(23, 59, 59, 999)

      let startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)

      if (activeFilter === "Yesterday") {
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)

        filtered = filtered.filter((review) => {
          const reviewDate = new Date(review.createdAt)
          return reviewDate >= startDate && reviewDate <= endDate
        })
      } else if (activeFilter === "Last 7 Days") {
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)

        filtered = filtered.filter((review) => {
          const reviewDate = new Date(review.createdAt)
          return reviewDate >= startDate && reviewDate <= today
        })
      } else if (activeFilter === "This Month") {
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 30)
        startDate.setHours(0, 0, 0, 0)

        filtered = filtered.filter((review) => {
          const reviewDate = new Date(review.createdAt)
          return reviewDate >= startDate && reviewDate <= today
        })
      } else {
        const endDate = new Date(selectedDate)
        endDate.setHours(23, 59, 59, 999)

        filtered = filtered.filter((review) => {
          const reviewDate = new Date(review.createdAt)
          return reviewDate >= startDate && reviewDate <= endDate
        })
      }
    } else {
      const today = new Date()
      const startOfToday = new Date(today)
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date(today)
      endOfToday.setHours(23, 59, 59, 999)

      filtered = filtered.filter((review) => {
        const reviewDate = new Date(review.createdAt)
        return reviewDate >= startOfToday && reviewDate <= endOfToday
      })
    }

    return filtered
  }

  const calculateMetricsFromFiltered = (filteredReviews: Review[]) => {
    return {
      newReviews: filteredReviews.length,
      positiveReviews: filteredReviews.filter((r) => r.sentiment === "positive").length,
      negativeReviews: filteredReviews.filter((r) => r.sentiment === "negative").length,
      unansweredQuestions: filteredReviews.filter((r) => r.isQuestion).length,
    }
  }

  const getMetricsLabel = () => {
    switch (activeFilter) {
      case "Today":
        return "Today's activity"
      case "Yesterday":
        return "Yesterday's activity"
      case "Last 7 Days":
        return "Last 7 days activity"
      case "This Month":
        return "Last 30 days activity"
      default:
        return format(selectedDate, "MMMM d, yyyy")
    }
  }

  const handleQuickFilter = (filter: string, days: number) => {
    setActiveFilter(filter)
    if (filter === "Today" || filter === "Yesterday" || filter === "Last 7 Days" || filter === "This Month") {
      // Keep current selectedDate for display purposes
    } else {
      const newDate = new Date()
      newDate.setDate(newDate.getDate() - days)
      setSelectedDate(newDate)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const filteredReviews = getFilteredReviews()
  const liveMetrics = calculateMetricsFromFiltered(filteredReviews)

  const actionableReviews = filteredReviews
    .filter((review) => review.isQuestion || review.sentiment === "negative")
    .sort((a, b) => {
      // Prioritize: questions with negative sentiment > questions > negative reviews
      const scoreA = (a.isQuestion ? 2 : 0) + (a.sentiment === "negative" ? 1 : 0)
      const scoreB = (b.isQuestion ? 2 : 0) + (b.sentiment === "negative" ? 1 : 0)
      return scoreB - scoreA
    })
    .slice(0, 3) // Show top 3 actionable items

  const getSentimentStyles = (sentiment: Sentiment) => {
    switch (sentiment) {
      case "positive":
        return "bg-[var(--color-positive)] border-[var(--color-positive-border)]"
      case "neutral":
        return "bg-[var(--color-neutral)] border-[var(--color-neutral-border)]"
      case "negative":
        return "bg-[var(--color-negative)] border-[var(--color-negative-border)]"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading Reddit reviews...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-destructive font-medium">Error loading reviews</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button onClick={fetchReviews} variant="outline" size="lg" className="mt-4 gap-2 bg-transparent">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <div className="mt-6 p-4 bg-muted rounded-lg text-left">
            <p className="text-sm font-medium mb-2">Setup Required:</p>
            <p className="text-xs text-muted-foreground">
              Add your Reddit app credentials as environment variables:
              <br />• REDDIT_CLIENT_ID
              <br />• REDDIT_CLIENT_SECRET
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">L</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Lenovo</h1>
                <p className="text-sm text-muted-foreground font-medium">Reviews Analytics Dashboard</p>
              </div>
            </div>
            <Button onClick={fetchReviews} variant="outline" size="lg" className="gap-2 bg-transparent">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {actionableReviews.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Actionable Feedback
                </h2>
                <p className="text-muted-foreground mt-1">Reviews requiring immediate attention</p>
              </div>
              <Badge variant="destructive" className="text-base px-4 py-2 font-bold">
                {actionableReviews.length} {actionableReviews.length === 1 ? "Item" : "Items"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {actionableReviews.map((review) => (
                <Card
                  key={review.id}
                  className="border-2 border-primary/30 bg-gradient-to-br from-card to-primary/5 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-3 mb-3">
                      {review.isQuestion && review.sentiment === "negative" ? (
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <HelpCircle className="w-5 h-5 text-primary" />
                        </div>
                      ) : review.isQuestion ? (
                        <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                          <HelpCircle className="w-5 h-5 text-orange-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-red-100 rounded-lg shrink-0">
                          <ThumbsDown className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2">
                          {review.isQuestion && (
                            <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-300 font-semibold">
                              Question
                            </Badge>
                          )}
                          {review.sentiment === "negative" && (
                            <Badge className="text-xs bg-red-100 text-primary border-primary/30 font-semibold">
                              Negative
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {review.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground leading-tight line-clamp-2">
                      {review.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">{review.summary}</p>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <ArrowUp className="w-4 h-4" />
                          <span>{review.upvotes}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4" />
                          <span>{review.comments}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                        asChild
                      >
                        <a href={review.redditUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-1.5" />
                          Respond
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Live Metrics</h2>
            <p className="text-muted-foreground">{getMetricsLabel()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0">
                    New
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-foreground">{liveMetrics.newReviews}</p>
                  <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <ThumbsUp className="w-6 h-6 text-green-600" />
                  </div>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-0">
                    Positive
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-foreground">{liveMetrics.positiveReviews}</p>
                  <p className="text-sm font-medium text-muted-foreground">Positive Sentiment</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <ThumbsDown className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant="secondary" className="bg-red-50 text-primary border-0">
                    Negative
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-foreground">{liveMetrics.negativeReviews}</p>
                  <p className="text-sm font-medium text-muted-foreground">Negative Sentiment</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <HelpCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-0">
                    Action
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-foreground">{liveMetrics.unansweredQuestions}</p>
                  <p className="text-sm font-medium text-muted-foreground">Questions Detected</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Historical Analysis</h2>
              <p className="text-muted-foreground mt-1">Filter reviews by date and category</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card p-6 rounded-xl border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="lg" className="w-[260px] justify-start font-medium bg-transparent">
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <Button
                  key={filter.label}
                  variant={activeFilter === filter.label ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickFilter(filter.label, filter.days)}
                  className="font-medium"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                onClick={() => setActiveCategory(category)}
                size="lg"
                className="rounded-full font-medium"
              >
                {category}
              </Button>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between py-4 border-y">
          <div>
            <h3 className="text-xl font-bold text-foreground">
              {filteredReviews.length} {filteredReviews.length === 1 ? "Review" : "Reviews"} Found
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{format(selectedDate, "MMMM d, yyyy")}</p>
          </div>
        </div>

        {filteredReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {filteredReviews.map((review) => (
              <Card
                key={review.id}
                className={`${getSentimentStyles(review.sentiment)} border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${review.isQuestion ? "ring-2 ring-orange-400" : ""}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-3">
                    <CardTitle className="text-lg font-bold text-foreground leading-tight line-clamp-2">
                      {review.title}
                    </CardTitle>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs font-semibold whitespace-nowrap">
                        {review.category}
                      </Badge>
                      {review.isQuestion && (
                        <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-300 font-semibold">
                          Question
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{review.summary}</p>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <ArrowUp className="w-4 h-4" />
                        <span>{review.upvotes}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4" />
                        <span>{review.comments}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary-foreground hover:bg-primary font-medium"
                      asChild
                    >
                      <a href={review.redditUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        View
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-4">
            <div className="mx-auto w-20 h-20 bg-muted rounded-2xl flex items-center justify-center">
              <CalendarIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">No reviews found</h3>
              <p className="text-muted-foreground">Try selecting a different date or adjusting your filters</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
