import React from 'react';

const I = ({ d, extra }: { d?: string; extra?: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d && <path d={d} />}
    {extra}
  </svg>
);

export const IcDisbursed = () =>
  <I extra={<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>} />;

export const IcCalendar = () =>
  <I extra={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>} />;

export const IcTrend = () =>
  <I extra={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>} />;

export const IcAlert = () =>
  <I extra={<>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </>} />;

export const IcClock = () =>
  <I extra={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />;

export const IcUsers = () =>
  <I extra={<>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </>} />;

export const IcShield = () =>
  <I d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;

export const IcCheck = () =>
  <I extra={<polyline points="20 6 9 17 4 12"/>} />;

export const IcDollar = () =>
  <I extra={<>
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </>} />;

export const IcRefresh = () =>
  <I extra={<>
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </>} />;
