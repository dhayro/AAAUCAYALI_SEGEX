import { useSidebar } from "@/context/SidebarContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  TableIcon,
  UserCircleIcon,
  LogoutIcon,
  ChatBubbleIcon,
} from "../icons";
import { cn } from "../utils";
import { perfilActual, puedeGestionarAsignaciones } from "../utils/sesion";

type NavItem = {
  name: string;
  key?: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  gestoresOnly?: boolean;
  cerrarSesion?: boolean;
  target?: string;
  subItems?: {
    name: string;
    key?: string;
    path: string;
    pro?: boolean;
    new?: boolean;
    target?: string;
  }[];
};

// Menús que ve el perfil personal (además de Perfil, para sus propios datos).
const MENUS_PERSONAL = ["dashboard", "asignacion-expediente", "llamadas", "consultas", "consulta-cut", "consulta-persona", "mi-desempeno", "profile", "logout"];

const visibleParaPerfil = (items: NavItem[]) => {
  if (perfilActual() === "personal") {
    return items
      .filter((item) => MENUS_PERSONAL.includes(item.key ?? ""))
      .map((item) => (item.subItems ? { ...item, subItems: item.subItems.filter((sub) => MENUS_PERSONAL.includes(sub.key ?? "")) } : item));
  }
  return items.filter((item) => !item.gestoresOnly || puedeGestionarAsignaciones());
};

const navItems: NavItem[] = [
  {
    icon: <ListIcon fontSize={24} />,
    name: "Maestros",
    key: "maestros",
    subItems: [
      {
        name: "Cargos",
        key: "cargos",
        path: "/cargos",
      },
      {
        name: "Áreas",
        key: "areas",
        path: "/areas",
      },
      {
        name: "Tipos Documentos",
        key: "tipos",
        path: "/tipos-documentos",
      },
      {
        name: "Procedimientos",
        key: "procedimientos",
        path: "/procedimientos",
      },
      {
        name: "Acciones de Atención",
        key: "acciones-atencion",
        path: "/acciones-atencion",
      },
      {
        name: "Usuarios",
        key: "usuarios",
        path: "/usuarios",
      },
    ],
  },
  {
    icon: <GridIcon fontSize={24} />,
    name: "Dashboard",
    key: "dashboard",
    path: "/",
  },
  {
    icon: <TableIcon fontSize={24} />,
    name: "Asignación de Expediente",
    key: "asignacion-expediente",
    path: "/asignacion-expediente",
  },
  {
    icon: <TableIcon fontSize={24} />,
    name: "Prórrogas",
    key: "prorrogas",
    path: "/prorrogas",
  },
  {
    icon: <TableIcon fontSize={24} />,
    name: "Evaluación de Respuestas",
    key: "evaluacion-respuestas",
    path: "/evaluacion-respuestas",
    gestoresOnly: true,
  },
  {
    icon: <TableIcon fontSize={24} />,
    name: "Control de Llamadas",
    key: "llamadas",
    path: "/llamadas",
  },
  {
    icon: <PageIcon fontSize={24} />,
    name: "Consultas",
    key: "consultas",
    gestoresOnly: true,
    subItems: [
      {
        name: "Expedientes",
        key: "expedientes",
        path: "/expedientes",
      },
      {
        name: "Buscar por CUT",
        key: "consulta-cut",
        path: "/reporte-historial",
      },
      {
        name: "Consulta por persona",
        key: "consulta-persona",
        path: "/consulta-persona",
      },
    ],
  },
  {
    icon: <PieChartIcon fontSize={24} />,
    name: "Reportes",
    key: "reportes",
    subItems: [
      {
        name: "Asignaciones",
        key: "reporte-asignaciones",
        path: "/reporte-asignaciones",
      },
      {
        name: "Llamadas",
        key: "reporte-llamadas",
        path: "/reporte-llamadas",
      },
      {
        name: "Resumen del periodo",
        key: "reporte-resumen",
        path: "/reporte-resumen",
      },
      {
        name: "Productividad",
        key: "reporte-productividad",
        path: "/reporte-productividad",
      },
      {
        name: "Prórrogas",
        key: "reporte-prorrogas",
        path: "/reporte-prorrogas",
      },
      {
        name: "Expedientes sin asignar",
        key: "reporte-sin-asignar",
        path: "/reporte-sin-asignar",
      },
      {
        name: "Acciones de llamada",
        key: "reporte-acciones",
        path: "/reporte-acciones",
      },
    ],
  },
  {
    icon: <UserCircleIcon fontSize={24} />,
    name: "Mi desempeño",
    key: "mi-desempeno",
    path: "/mi-desempeno",
  },
];

const othersItems: NavItem[] = [
  {
    icon: <UserCircleIcon fontSize={24} />,
    name: "Mi perfil",
    key: "profile",
    path: "/profile",
  },
  {
    icon: <ChatBubbleIcon fontSize={24} />,
    name: "Monitor de llamadas",
    key: "monitor-llamadas",
    path: "/monitor-llamadas",
    gestoresOnly: true,
  },
  {
    icon: <TableIcon fontSize={24} />,
    name: "Admin Tokens SISGED",
    key: "admin-tokens-sisged",
    path: "/admin-sisged-tokens",
  },
  {
    icon: <LogoutIcon fontSize={24} />,
    name: "Cerrar sesión",
    key: "logout",
    path: "/signin",
    cerrarSesion: true,
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, setIsMobileOpen } =
    useSidebar();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {},
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-close sidebar on mobile after route change
  useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  useEffect(() => {
    let submenuMatched = false;

    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;

      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-1">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`group menu-item ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "xl:justify-center"
                  : "xl:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>

              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">
                  {nav.name}
                </span>
              )}
              {nav.new && (isExpanded || isHovered || isMobileOpen) && (
                <span
                  className={`absolute inset-e-10 ms-auto ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "menu-dropdown-badge-active"
                      : "menu-dropdown-badge-inactive"
                  } menu-dropdown-badge`}
                >
                  Nuevo
                </span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ms-auto h-5 w-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                target={nav.target}
                onClick={nav.cerrarSesion ? () => localStorage.removeItem("token") : undefined}
                className={`group menu-item ${
                  nav.cerrarSesion
                    ? "font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    : isActive(nav.path)
                    ? "menu-item-active"
                    : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">
                    {nav.name}
                  </span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="ms-9 mt-2 space-y-1">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      target={subItem.target}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="ms-auto flex items-center gap-1">
                        {subItem.new && (
                          <span
                            className={`ms-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            Nuevo
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ms-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-pro-active"
                                : "menu-dropdown-badge-pro-inactive"
                            } menu-dropdown-badge-pro`}
                          >
                            Pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={cn(
        "fixed inset-s-0 top-0 z-50 flex h-screen flex-col border-e border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:translate-x-0 xl:rtl:translate-x-0 dark:border-gray-800 dark:bg-gray-900",
        isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5",
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full rtl:translate-x-full",
      )}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex py-8",
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start",
        )}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo_horizontal.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo_horizontal.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/logo_ico.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "MENÚ"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(visibleParaPerfil(navItems), "main")}
            </div>

            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "OTROS"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(visibleParaPerfil(othersItems), "others")}
            </div>
          </div>
        </nav>

      </div>
    </aside>
  );
};

export default AppSidebar;
