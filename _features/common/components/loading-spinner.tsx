import './loading-spinner.css';

const LoadingSpinner = () => (
  <span
    data-loading-spinner=''
    role='status'
    aria-busy='true'
    aria-label='불러오는 중'
    className='loading-spinner'
  />
);

export default LoadingSpinner;
