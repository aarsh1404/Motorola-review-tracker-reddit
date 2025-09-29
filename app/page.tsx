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
  Info,
} from "lucide-react"
import { format } from "date-fns"

type Sentiment = "positive" | "neutral" | "negative"
type Category =
  | "All"
  | "Moto G Series"
  | "Moto Edge Series"
  | "Motorola Audio"
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
  "Moto G Series",
  "Moto Edge Series",
  "Motorola Audio",
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

export default function MotorolaReviewsDashboard() {
  const [activeCategory, setActiveCategory] = useState<Category>("All")
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [activeFilter, setActiveFilter] = useState<string>("Today")
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    newReviews: 0,
    positiveReviews: 0,
    negativeReviews: 0,
    unansweredQuestions: 0,
  })

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
        createdAt: new Date().toISOString(),
        isQuestion: detectQuestion(review.title, review.summary),
      }))

      setReviews(enhancedReviews)
      calculateLiveMetrics(enhancedReviews)
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

  const calculateLiveMetrics = (reviewsData: Review[]) => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentReviews = reviewsData.filter((review) => new Date(review.createdAt) > last24Hours)

    setLiveMetrics({
      newReviews: recentReviews.length,
      positiveReviews: recentReviews.filter((r) => r.sentiment === "positive").length,
      negativeReviews: recentReviews.filter((r) => r.sentiment === "negative").length,
      unansweredQuestions: recentReviews.filter((r) => r.isQuestion).length,
    })
  }

  const getFilteredReviews = () => {
    let filtered = activeCategory === "All" ? reviews : reviews.filter((review) => review.category === activeCategory)

    if (activeFilter !== "Today") {
      const filterDate = new Date(selectedDate)
      if (activeFilter === "Yesterday") {
        filterDate.setDate(filterDate.getDate() - 1)
      } else if (activeFilter === "Last 7 Days") {
        filterDate.setDate(filterDate.getDate() - 7)
      } else if (activeFilter === "This Month") {
        filterDate.setDate(filterDate.getDate() - 30)
      }

      filtered = filtered.filter((review) => {
        const reviewDate = new Date(review.createdAt)
        return reviewDate >= filterDate
      })
    }

    return filtered
  }

  const handleQuickFilter = (filter: string, days: number) => {
    setActiveFilter(filter)
    const newDate = new Date()
    newDate.setDate(newDate.getDate() - days)
    setSelectedDate(newDate)
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const filteredReviews = getFilteredReviews()

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
          <Button onClick={fetchReviews} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Live Review Tracker - Last 24 Hours (EST)</h1>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>
                Questions identified by: ? in title, keywords (help, how to, why, issue, problem, troubleshoot, anyone
                know), question flairs
              </span>
            </div>
          </div>

          {/* Live Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-blue-500 text-white shadow-lg hover:scale-105 transition-transform duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Added</p>
                    <p className="text-3xl font-bold">{liveMetrics.newReviews}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-200" />
                </div>
                <p className="text-blue-100 text-xs mt-2">New Reviews</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500 text-white shadow-lg hover:scale-105 transition-transform duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Sentiment: Positive</p>
                    <p className="text-3xl font-bold">{liveMetrics.positiveReviews}</p>
                  </div>
                  <ThumbsUp className="w-8 h-8 text-green-200" />
                </div>
                <p className="text-green-100 text-xs mt-2">Positive Reviews</p>
              </CardContent>
            </Card>

            <Card className="bg-red-500 text-white shadow-lg hover:scale-105 transition-transform duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Sentiment: Negative</p>
                    <p className="text-3xl font-bold">{liveMetrics.negativeReviews}</p>
                  </div>
                  <ThumbsDown className="w-8 h-8 text-red-200" />
                </div>
                <p className="text-red-100 text-xs mt-2">Negative Reviews</p>
              </CardContent>
            </Card>

            <Card className="bg-orange-500 text-white shadow-lg hover:scale-105 transition-transform duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Need Responses</p>
                    <p className="text-3xl font-bold">{liveMetrics.unansweredQuestions}</p>
                  </div>
                  <HelpCircle className="w-8 h-8 text-orange-200" />
                </div>
                <p className="text-orange-100 text-xs mt-2">Unanswered Questions</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Historical Review Analysis</h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
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
              <span className="text-sm text-muted-foreground">Viewing: {format(selectedDate, "MMMM d, yyyy")}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <Button
                  key={filter.label}
                  variant={activeFilter === filter.label ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickFilter(filter.label, filter.days)}
                  className="transition-all duration-200"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              onClick={() => setActiveCategory(category)}
              className="rounded-full px-6 py-2 transition-all duration-200 hover:scale-105"
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="text-center">
          <h3 className="text-xl font-medium text-foreground">
            Reviews for {format(selectedDate, "MMMM d, yyyy")} - {filteredReviews.length} Results Found
          </h3>
        </div>

        {/* Reviews Grid */}
        {filteredReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((review) => (
              <Card
                key={review.id}
                className={`${getSentimentStyles(review.sentiment)} border-2 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${review.isQuestion ? "ring-2 ring-orange-200" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">{review.title}</CardTitle>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {review.category}
                      </Badge>
                      {review.isQuestion && (
                        <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                          Question
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{review.summary}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ArrowUp className="w-4 h-4" />
                        <span>{review.upvotes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{review.comments}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary-foreground hover:bg-primary"
                      asChild
                    >
                      <a href={review.redditUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Reddit
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
              <CalendarIcon className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">No reviews found for this date</h3>
              <p className="text-muted-foreground">Try selecting another date or adjusting your filters.</p>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="text-center pt-8">
          <Button onClick={fetchReviews} variant="outline" className="bg-transparent">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>
    </div>
  )
}
