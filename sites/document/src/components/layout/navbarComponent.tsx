import { Fragment, useState, useEffect } from 'react'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { loginRequest } from '../../auth/msalConfig'
import { Button } from '@wps/input'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { ChevronDown } from 'lucide-react'

export function NavbarComponent() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [accountImageUrl, setAccountImageUrl] = useState<string | null>(null);
  const accountLabel = accounts[0]?.name ?? accounts[0]?.username;

  function handleLogin() {
    instance.loginRedirect(loginRequest);
  };

  function handleLogout() {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    });
  };

  useEffect(() => {
    let revokedUrl: string | null = null;

    async function loadPhoto() {
      if (!accounts[0]) return;

      const token = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });

      // Check if photo exists first to avoid 404 in console
      const metadataResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });

      if (!metadataResponse.ok) {
        setAccountImageUrl(null);
        return;
      }
      const metadata = await metadataResponse.json();
      if (!metadata.photo) {
        setAccountImageUrl(null);
        return;
      }

      const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });

      if (!response.ok) {
        setAccountImageUrl(null);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      revokedUrl = url;
      setAccountImageUrl(url);
    }

    loadPhoto().catch(() => setAccountImageUrl(null));

    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [accounts, instance]);


  return (
    <>
      <nav className={`border-b border-primary sticky top-0 z-[1000] screen-only bg-white px-0 md:px-4`}>
        <div className='max-w-7xl mx-auto flex flex-row items-center justify-between py-3 px-4 md:px-0'>
          <a href="/" className='flex items-center gap-2'>
            <img src="/compass_Name.svg" alt="White Point Survey Logo" className="h-10 w-auto" />
          </a>
          <div className='flex items-center gap-3'>
            {isAuthenticated && accountLabel ? (
              <Menu as="div" className="relative">
                <MenuButton className="px-2 py-1 hover:bg-gray-100">
                  <div className='flex items-center gap-2'>
                    {accountImageUrl ? (
                      <img src={accountImageUrl} alt={`${accountLabel}'s profile`} className='h-8 w-8 rounded-full' />
                    ) : (
                      <div
                        className='h-8 w-8 rounded-full flex items-center justify-center'
                        style={{ backgroundColor: stringToColor(accountLabel) }}
                      >
                        <span className='text-xs text-white'>{initials(accountLabel)}</span>
                      </div>
                    )}
                    <span className='text-sm font-medium'>{accountLabel}</span>
                    <ChevronDown size={16} className='' />
                  </div>
                </MenuButton>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right border border-gray-200 bg-white shadow-lg focus:outline-none">
                    <div className="px-1 py-1">
                      <MenuItem
                        as="button"
                        type="button"
                        onClick={handleLogout}
                        className="group flex w-full items-center px-2 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                      >
                        Sign out
                      </MenuItem>
                    </div>
                  </MenuItems>
                </Transition>
              </Menu>
            ) : (
              <Button
                label="Sign In"
                style='primary'
                size='small'
                onClick={handleLogin}
              />
            )}
          </div>
        </div>
      </nav>

      {!isAuthenticated && (
        <div className="border-b border-primary bg-white screen-only">
          <div className='max-w-7xl mx-auto text-primary py-1 text-center'>
            If you are an employee of White Point Surveying & Mapping LLC, please log in to access internal documentation and tools.
          </div>
        </div>
      )}
    </>
  )
}

function stringToColor(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}