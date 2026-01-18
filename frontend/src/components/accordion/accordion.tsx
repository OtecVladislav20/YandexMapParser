import { useState } from 'react';
import styles from './accordion.module.scss';
import clsx from "clsx";


type TAccordion = {
  title: React.ReactNode;
  children: React.ReactNode;
};

export default function Accordion({title, children}: TAccordion): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className={clsx(styles.accordion, open && styles.open)}>
      <div className={clsx(styles.header, 'big-text-med')} onClick={() => setOpen(!open)}>
        {title}
      </div>
      <div className={styles.body}>
        {children}
      </div>
    </div>
  );
}
