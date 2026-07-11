import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { membershipForUserRestaurant, setCurrentRestaurantCookie } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'api:restaurant-switch', 40, 60_000);
  if (limited) return limited;
  const user = await currentUser();
  if (!user) redirect('/login');
  const formData = await request.formData();
  const restaurantId = String(formData.get('restaurantId') || '');
  if (restaurantId) {
    const membership = await membershipForUserRestaurant(user.id, restaurantId);
    if (membership) setCurrentRestaurantCookie(restaurantId);
  }
  redirect('/dashboard');
}
