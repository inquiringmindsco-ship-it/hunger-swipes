-- Ferguson image pilot: preserve researched candidates for rights review,
-- retire confirmed-closed records, and promote the first approved community
-- food photo into the Place hero automatically.

create table if not exists public.place_image_candidates (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  dish_name text not null,
  image_url text not null check (image_url ~ '^https://'),
  source_url text not null check (source_url ~ '^https://'),
  source_type text not null,
  rights_status text not null default 'permission_required'
    check (rights_status in ('permission_required', 'approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, image_url)
);

alter table public.place_image_candidates enable row level security;
-- Deliberately no public policy: candidates remain service-role/admin research
-- until rights_status is explicitly changed to approved.

insert into public.place_image_candidates
  (place_id, dish_name, image_url, source_url, source_type, rights_status, notes)
values
  ('96cbcb9f-3e48-4904-bd35-dffe3615bbf4', 'Whopper',
   'https://cdn.prod.website-files.com/631b4b4e277091ef01450237/69a07cfb72c3202535a7580c_Elevated_Whopper_Hero_Image.jpg',
   'https://news.bk.com/blog-posts/burger-king-elevates-its-most-iconic-product-the-whopper-r',
   'official brand newsroom', 'permission_required', 'Chainwide brand product; newsroom restrictions require review.'),
  ('b98c0c72-5d93-4a56-9f2a-c6831f79da13', 'Fried Chicken & Tenders',
   'https://a.mktgcdn.com/p/1qhNeiks_ekJnArW663vGMTfhT9ljEfi1afqGbkX64Y/1127x800.webp',
   'https://locations.churchs.com/mo/ferguson/10646-new-halls-ferry-road',
   'official Ferguson location page', 'permission_required', 'Brand-specific meal image from an official location property.'),
  ('06195185-90cb-4a21-8050-a66ade32e0bf', 'Country Fried Steak',
   'https://i0.wp.com/blog.crackerbarrel.com/wp-content/uploads/2023/03/country_fried_steak_800x600.jpg?resize=800%2C533&ssl=1',
   'https://blog.crackerbarrel.com/top-10-most-popular-cracker-barrel-menu-items/',
   'official brand blog', 'permission_required', 'Featured in the official top-ten menu article.'),
  ('713e8fa0-93b1-4531-8480-86c8a72a344f', 'Original Buttermilk Pancakes (Full Stack)',
   'https://d3hpc9frzzutmq.cloudfront.net/cdn/ihop/uploads/2022/12/25103642/five-stack-pancake.jpg',
   'https://ihopmexico.com/platillos/original-buttermilk/',
   'official brand menu (regional)', 'permission_required', 'Official regional brand image; chainwide representative.'),
  ('a500973d-5025-4f80-be20-9eb8e47a326a', 'Original Glazed Doughnut',
   'https://cdn.sanity.io/images/9tlw6prn/production/f3ea4b494b165651d01f94099187de9b17215860-480x480.png?auto=format&fit=min&h=828&q=85&w=828',
   'https://www.krispykreme.com/menu/doughnuts/glazed',
   'official brand menu', 'permission_required', 'Signature chainwide product.'),
  ('40fe1bce-7c6a-4360-a087-9f436a4cc24d', 'Big Mac',
   'https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0005-999_BigMac_1564x1564-1%3Anutrition-calculator-tile?fmt=png-alpha',
   'https://www.mcdonalds.com/us/en-us/product/big-mac.html',
   'official brand menu', 'permission_required', 'Chainwide brand product.'),
  ('db468225-5c8e-4cc8-b872-e36e209132dc', 'Pepperoni Pizza',
   'https://cdn.papajohns.com.pa/thumbnails/pizzas/classicpepperoni_1739315132_large.webp',
   'https://www.papajohns.com.pa/pizzas/pizza-classic-pepperoni/',
   'official brand menu (regional)', 'permission_required', 'Official regional brand image.'),
  ('44a215ef-6195-4e1c-8021-c94826e7cf32', 'Steak Pinwheel',
   'https://paulsmarketstl.com/wp-content/uploads/2019/02/pinwheel1.jpg',
   'https://paulsmarketstl.com/',
   'restaurant official site', 'permission_required', 'Restaurant-specific product image.'),
  ('dc58ae1c-a5bf-4977-ab79-6296559bc626', 'Caramel Macchiato',
   'https://athome.starbucks.com/sites/default/files/2024-05/CaramelMacchiato_RecipeHeader_848x539_%402x.jpg',
   'https://athome.starbucks.com/recipe/caramel-macchiato',
   'official brand recipe', 'permission_required', 'Official brand image; chainwide representative.'),
  ('ced386c0-a201-4871-b942-afa1cc5ebfe9', 'Original Double ''n Cheese Steakburger',
   'https://www.steaknshake.com/wp-content/uploads/2026/03/steakburger-1-2.png',
   'https://www.steaknshake.com/locations/mo-st-louis-new-halls-ferry-road/',
   'official brand and Ferguson location site', 'permission_required', 'Official brand product tied to the current location page.'),
  ('0c78260c-0cf8-464a-bbe6-9ea601915153', 'Italiano B.M.T.',
   'https://www.subwaypanama.com/content/20220616112130-1.jpg',
   'https://www.subwaypanama.com/menu/497/italiano-bmt?gdpr=1',
   'official brand menu (regional)', 'permission_required', 'Confirm Ferguson availability before approval.'),
  ('ecb8c61d-a5b5-4d59-90ba-a1388f1c0151', 'Grasshopper Waffle Sundae',
   'https://whistlestopfrozencustard.weebly.com/uploads/1/2/0/5/120538380/grasshopper-waffle-sundae_orig.jpg',
   'https://whistlestopfrozencustard.weebly.com/',
   'restaurant official site', 'permission_required', 'Restaurant-specific product image.'),
  ('e22d1aba-e03c-4567-9fa2-eac75ce36cc3', 'Lemon Pepper Wings',
   'https://www.palacestation.com/wp-content/uploads/2021/01/Wingstop-Lemon-Pepper-Wings.jpg',
   'https://www.palacestation.com/eat-and-drink/wingstop/',
   'verified Wingstop operator page', 'permission_required', 'Verify Ferguson availability and permission before approval.')
on conflict (place_id, image_url) do update set
  dish_name = excluded.dish_name,
  source_url = excluded.source_url,
  source_type = excluded.source_type,
  notes = excluded.notes,
  updated_at = now();

update public.places
set status = 'hidden', operational_status = 'closed'
where id in (
  '86ef4d72-792b-417b-bbd2-ff7c2be77fbb', -- Corner Coffee House: closed in 2017
  'b623fbc3-25d3-468e-b7fc-220b1b5fdba5'  -- Ferguson Brewing Company: closed in 2025
);

create or replace function public.sync_approved_community_place_image()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replacement text;
begin
  if NEW.status = 'active' and NEW.moderation_status = 'approved' then
    update public.places
      set approved_community_place_image_url = NEW.photo_url
    where id = NEW.place_id
      and approved_owner_place_image_url is null
      and approved_community_place_image_url is null;
  elsif TG_OP = 'UPDATE' then
    if OLD.status = 'active'
      and OLD.moderation_status = 'approved'
      and (NEW.status <> 'active' or NEW.moderation_status <> 'approved') then
      select photo_url into v_replacement
      from public.community_food_posts
      where place_id = OLD.place_id
        and status = 'active'
        and moderation_status = 'approved'
        and id <> OLD.id
      order by created_at asc
      limit 1;

      update public.places
        set approved_community_place_image_url = v_replacement
      where id = OLD.place_id
        and approved_community_place_image_url = OLD.photo_url;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists sync_approved_community_place_image on public.community_food_posts;
create trigger sync_approved_community_place_image
  after insert or update of status, moderation_status on public.community_food_posts
  for each row execute function public.sync_approved_community_place_image();

grant execute on function public.sync_approved_community_place_image() to service_role;
