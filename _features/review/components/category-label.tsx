import { getCategoryIcon } from '../lib/category-icon';

const CategoryLabel = ({ category }: { category: string }) => (
  <span className='inline-flex items-center gap-1.5 align-middle'>
    <span aria-hidden='true' className='shrink-0'>
      {getCategoryIcon(category)}
    </span>
    <span>{category}</span>
  </span>
);

export default CategoryLabel;
