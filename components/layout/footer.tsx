import { project } from '@/app/_constant/web';

const Footer = () => {
  return (
    <footer id='about' className='border-t border-stone-200 bg-white'>
      <div className='mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-10'>
        <div>
          <p className='text-lg font-bold tracking-tight'>
            {project.title}
            <span className='ml-3 text-xs font-normal text-stone-400'>
              {project.footer_description}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
