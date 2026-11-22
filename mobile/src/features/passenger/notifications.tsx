import { router } from 'expo-router';
import { Card, Empty, MenuRow, Screen } from '@/components/ui';
import { passengerNotices } from '@/lib/notices';
import { usePassenger } from '@/lib/passenger-store';
import { useRides } from '@/lib/rides-store';

export function PassengerNotifications() {
  const { passenger } = usePassenger();
  const { rides } = useRides();
  const items = passengerNotices(passenger, rides);
  if (!items.length)
    return (
      <Empty title="Rien de nouveau" body="Vos cadeaux, rappels et courses apparaîtront ici." />
    );
  return (
    <Screen>
      {items.map((n) => (
        <Card key={n.id}>
          <MenuRow title={n.title} sub={n.body} icon={n.icon} onPress={() => router.push(n.path)} />
        </Card>
      ))}
    </Screen>
  );
}
