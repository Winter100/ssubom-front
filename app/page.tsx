import HomeHero from './_components/home-hero';
import HomeSidebar from './_components/home-sidebar';
import ReviewFeed from './_components/review-feed';

const Home = () => (
  <div className='min-h-screen bg-[#fafbf9] font-sans text-[#202a26] selection:bg-emerald-100'>
    <main className='mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-10 sm:pt-14'>
      <HomeHero />
      <div className='mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-12'>
        <ReviewFeed />
        <HomeSidebar />
      </div>
    </main>
  </div>
);

export default Home;
