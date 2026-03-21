import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Phone, Mail, Plus, Search } from 'lucide-react';
import type { Contact } from '@/types';
import { CONTACT_TYPE_COLORS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface ContactWithCounts extends Contact {
  listings_count: number;
  deals_count: number;
  communications_count: number;
}

async function fetchContactsWithCounts(): Promise<ContactWithCounts[]> {
  const supabase = createAdminClient();

  // Fetch all contacts
  const { data: allContacts, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }

  if (!allContacts) {
    return [];
  }

  // Fetch counts for each contact
  const contactsWithCounts = await Promise.all(
    allContacts.map(async (contact) => {
      const [listings, deals, communications] = await Promise.all([
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', contact.id),
        supabase
          .from('deals')
          .select('id', { count: 'exact', head: true })
          .eq('contact_id', contact.id),
        supabase
          .from('communications')
          .select('id', { count: 'exact', head: true })
          .eq('contact_id', contact.id),
      ]);

      return {
        ...contact,
        listings_count: listings.count || 0,
        deals_count: deals.count || 0,
        communications_count: communications.count || 0,
      };
    })
  );

  return contactsWithCounts;
}

function filterContacts(
  contacts: ContactWithCounts[],
  searchQuery: string,
  typeFilter: 'all' | 'buyer' | 'seller'
): ContactWithCounts[] {
  return contacts.filter((contact) => {
    const matchesType = typeFilter === 'all' || contact.type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesSearch;
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getPrefChannelLabel(channel: string): string {
  return channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
}

interface SearchParams {
  search?: string;
  type?: 'all' | 'buyer' | 'seller';
}

function buildSearchParams(search: string, type: 'all' | 'buyer' | 'seller'): string {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type !== 'all') params.set('type', type);
  return params.toString();
}

export default async function ContactsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const searchQuery = params.search || '';
  const typeFilter = (params.type || 'all') as 'all' | 'buyer' | 'seller';

  const contacts = await fetchContactsWithCounts();
  const filteredContacts = filterContacts(contacts, searchQuery, typeFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/contacts/new">
            <Plus className="h-4 w-4" />
            Add Contact
          </Link>
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-4">
        {/* Search Form */}
        <form method="get" action="/contacts" className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder="Search by name, phone, or email..."
            defaultValue={searchQuery}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input type="hidden" name="type" value={typeFilter} />
        </form>

        {/* Type Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'buyer', 'seller'] as const).map((type) => {
            const queryString = buildSearchParams(searchQuery, type);
            const href = queryString ? `/contacts?${queryString}` : '/contacts';
            const isActive = typeFilter === type;

            return (
              <Link
                key={type}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {type === 'all' ? 'All' : type === 'buyer' ? 'Buyers' : 'Sellers'}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Contacts List or Empty State */}
      {filteredContacts.length === 0 ? (
        <Card className="max-w-md animate-float-in">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {contacts.length === 0 ? 'No Contacts Yet' : 'No Results'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {contacts.length === 0
                ? 'Create your first contact to get started.'
                : 'Try adjusting your search filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Contact
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Channel
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Listings
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Deals
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Messages
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {contact.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-foreground">{contact.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`capitalize ${CONTACT_TYPE_COLORS[contact.type]}`}
                      >
                        {contact.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-xs">
                        {getPrefChannelLabel(contact.pref_channel)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-medium text-foreground">
                        {contact.listings_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-medium text-foreground">
                        {contact.deals_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-medium text-foreground">
                        {contact.communications_count}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(contact.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredContacts.map((contact) => (
              <Link key={contact.id} href={`/contacts/${contact.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-foreground">{contact.name}</h3>
                        <Badge
                          variant="outline"
                          className={`capitalize ${CONTACT_TYPE_COLORS[contact.type]}`}
                        >
                          {contact.type}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">{contact.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Badge variant="secondary" className="text-xs">
                          {getPrefChannelLabel(contact.pref_channel)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {contact.listings_count} listing{contact.listings_count !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {contact.deals_count} deal{contact.deals_count !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground pt-1">
                        Added {formatDate(contact.created_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
