import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Quote, Sparkles, RefreshCw } from "lucide-react";

// Comprehensive list of motivational quotes for ERP/Education context
const motivationalQuotes = [
  { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { quote: "In learning you will teach, and in teaching you will learn.", author: "Phil Collins" },
  { quote: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { quote: "Education is not preparation for life; education is life itself.", author: "John Dewey" },
  { quote: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
  { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { quote: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { quote: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
  { quote: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { quote: "Excellence is not a skill, it's an attitude.", author: "Ralph Marston" },
  { quote: "The only person who is educated is the one who has learned how to learn and change.", author: "Carl Rogers" },
  { quote: "Knowledge is power. Information is liberating. Education is the premise of progress.", author: "Kofi Annan" },
  { quote: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert" },
  { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { quote: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
  { quote: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { quote: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { quote: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { quote: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { quote: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { quote: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { quote: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { quote: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { quote: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { quote: "Act as if what you do makes a difference. It does.", author: "William James" },
  { quote: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { quote: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { quote: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { quote: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { quote: "If you want to achieve greatness stop asking for permission.", author: "Anonymous" },
  { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { quote: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { quote: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { quote: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { quote: "The harder the conflict, the greater the triumph.", author: "George Washington" },
  { quote: "Perseverance is not a long race; it is many short races one after the other.", author: "Walter Elliot" },
  { quote: "I never dreamed about success. I worked for it.", author: "Estée Lauder" },
  { quote: "Success is not how high you have climbed, but how you make a positive difference to the world.", author: "Roy T. Bennett" },
  { quote: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
  { quote: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
  { quote: "You learn more from failure than from success. Don't let it stop you.", author: "Unknown" },
  { quote: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { quote: "If you are working on something that you really care about, you don't have to be pushed.", author: "Steve Jobs" },
  { quote: "People who are crazy enough to think they can change the world are the ones who do.", author: "Rob Siltanen" },
  { quote: "Failure will never overtake me if my determination to succeed is strong enough.", author: "Og Mandino" },
  { quote: "We may encounter many defeats but we must not be defeated.", author: "Maya Angelou" },
  { quote: "Knowing is not enough; we must apply. Wishing is not enough; we must do.", author: "Johann Wolfgang Von Goethe" },
  { quote: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { quote: "Security is mostly a superstition. Life is either a daring adventure or nothing.", author: "Helen Keller" },
  { quote: "The man who has confidence in himself gains the confidence of others.", author: "Hasidic Proverb" },
  { quote: "The best revenge is massive success.", author: "Frank Sinatra" },
  { quote: "Definiteness of purpose is the starting point of all achievement.", author: "W. Clement Stone" },
  { quote: "To accomplish great things, we must not only act, but also dream; not only plan, but also believe.", author: "Anatole France" },
  { quote: "Don't be pushed around by the fears in your mind. Be led by the dreams in your heart.", author: "Roy T. Bennett" },
  { quote: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { quote: "The only way to achieve the impossible is to believe it is possible.", author: "Charles Kingsleigh" },
  { quote: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { quote: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { quote: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { quote: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
  { quote: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { quote: "Limitation is only a creation of our minds. We're all capable of so much more.", author: "Unknown" },
  { quote: "I attribute my success to this: I never gave or took any excuse.", author: "Florence Nightingale" },
  { quote: "Take the risk or lose the chance.", author: "Unknown" },
  { quote: "Great things never come from comfort zones.", author: "Unknown" },
  { quote: "Dream it. Wish it. Do it.", author: "Unknown" },
  { quote: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { quote: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { quote: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { quote: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { quote: "Little things make big days.", author: "Unknown" },
  { quote: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { quote: "Don't wait for opportunity. Create it.", author: "Unknown" },
  { quote: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
  { quote: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
  { quote: "Dream it. Believe it. Build it.", author: "Unknown" },
  { quote: "Work hard in silence. Let success be your noise.", author: "Frank Ocean" },
  { quote: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
];

// Get the quote index based on the current date (changes at midnight)
const getDailyQuoteIndex = (): number => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear % motivationalQuotes.length;
};

// Calculate time until midnight
const getTimeUntilMidnight = (): { hours: number; minutes: number; seconds: number } => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
};

export function MotivationCard() {
  const [quoteIndex, setQuoteIndex] = useState(getDailyQuoteIndex);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState(getTimeUntilMidnight);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Update countdown every second
    const timer = setInterval(() => {
      const time = getTimeUntilMidnight();
      setTimeUntilMidnight(time);
      
      // Check if it's midnight (new day)
      if (time.hours === 0 && time.minutes === 0 && time.seconds === 0) {
        setIsAnimating(true);
        setTimeout(() => {
          setQuoteIndex(getDailyQuoteIndex());
          setIsAnimating(false);
        }, 500);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentQuote = motivationalQuotes[quoteIndex];
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="shadow-premium border-primary/20 overflow-hidden">
      <CardHeader className="gradient-hero text-primary-foreground relative">
        <div className="absolute top-4 right-4 opacity-20">
          <Sparkles className="h-16 w-16" />
        </div>
        <CardTitle className="flex items-center gap-2">
          <Quote className="h-5 w-5" />
          Daily Motivation
        </CardTitle>
        <CardDescription className="text-primary-foreground/80">
          {formattedDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Quote Display */}
        <div 
          className={`relative p-6 rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10 border border-primary/10 transition-all duration-500 ${
            isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          <Quote className="absolute top-4 left-4 h-8 w-8 text-primary/20" />
          <Quote className="absolute bottom-4 right-4 h-8 w-8 text-primary/20 rotate-180" />
          
          <blockquote className="text-lg md:text-xl font-medium text-foreground text-center px-8 py-4 italic leading-relaxed">
            "{currentQuote.quote}"
          </blockquote>
          
          <p className="text-center text-primary font-semibold mt-4">
            — {currentQuote.author}
          </p>
        </div>

        {/* Next Quote Countdown */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm">Next quote in:</span>
          <div className="flex items-center gap-1 font-mono text-sm bg-secondary/50 px-3 py-1 rounded-full">
            <span className="font-bold text-primary">
              {String(timeUntilMidnight.hours).padStart(2, '0')}
            </span>
            <span>:</span>
            <span className="font-bold text-primary">
              {String(timeUntilMidnight.minutes).padStart(2, '0')}
            </span>
            <span>:</span>
            <span className="font-bold text-primary">
              {String(timeUntilMidnight.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Quote Statistics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <p className="text-2xl font-bold text-primary">{quoteIndex + 1}</p>
            <p className="text-xs text-muted-foreground">Quote of the Day</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <p className="text-2xl font-bold text-accent">{motivationalQuotes.length}</p>
            <p className="text-xs text-muted-foreground">Total Quotes</p>
          </div>
        </div>

        {/* ERP System Badge */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">SVIT ERP System</span>
            <span className="text-xs text-muted-foreground">v2.0</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
