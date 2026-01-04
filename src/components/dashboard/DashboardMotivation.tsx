import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

// Short motivational quotes for dashboard
const shortQuotes = [
  { quote: "Education is the most powerful weapon.", author: "Nelson Mandela" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Success is not final, failure is not fatal.", author: "Winston Churchill" },
  { quote: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { quote: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { quote: "The only limit to our realization of tomorrow is our doubts of today.", author: "FDR" },
  { quote: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { quote: "Act as if what you do makes a difference. It does.", author: "William James" },
  { quote: "Great things never come from comfort zones.", author: "Unknown" },
  { quote: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { quote: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
  { quote: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { quote: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { quote: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { quote: "Success usually comes to those too busy to be looking for it.", author: "Thoreau" },
  { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { quote: "I never dreamed about success. I worked for it.", author: "Estée Lauder" },
  { quote: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Proverb" },
  { quote: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { quote: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
];

// Get quote index based on the current date
const getDailyQuoteIndex = (): number => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear % shortQuotes.length;
};

export function DashboardMotivation() {
  const [quoteIndex, setQuoteIndex] = useState(getDailyQuoteIndex);

  useEffect(() => {
    // Check if day changed every minute
    const timer = setInterval(() => {
      const newIndex = getDailyQuoteIndex();
      if (newIndex !== quoteIndex) {
        setQuoteIndex(newIndex);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [quoteIndex]);

  const currentQuote = shortQuotes[quoteIndex];

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 border border-primary/20 mb-6">
      <div className="flex-shrink-0 p-2 rounded-full bg-primary/20">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground italic truncate">
          "{currentQuote.quote}"
        </p>
        <p className="text-xs text-muted-foreground">— {currentQuote.author}</p>
      </div>
    </div>
  );
}
