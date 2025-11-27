"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface HeaderContextValue {
  pageTitle: string | React.ReactNode;
  pageSubtitle?: string;
  actions?: React.ReactNode;
  setHeaderData: (data: {
    pageTitle: string | React.ReactNode;
    pageSubtitle?: string;
    actions?: React.ReactNode;
  }) => void;
}

const HeaderContext = createContext<HeaderContextValue | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [pageTitle, setPageTitle] = useState<string | React.ReactNode>("Dashboard");
  const [pageSubtitle, setPageSubtitle] = useState<string | undefined>();
  const [actions, setActions] = useState<React.ReactNode | undefined>();

  const setHeaderData = useCallback(
    (data: {
      pageTitle: string | React.ReactNode;
      pageSubtitle?: string;
      actions?: React.ReactNode;
    }) => {
      setPageTitle(data.pageTitle);
      setPageSubtitle(data.pageSubtitle);
      setActions(data.actions);
    },
    []
  );

  return (
    <HeaderContext.Provider
      value={{
        pageTitle,
        pageSubtitle,
        actions,
        setHeaderData,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}

