CREATE TYPE public.heritage_category AS ENUM ('monument','art_form','festival','craft');
CREATE TYPE public.heritage_status AS ENUM ('pending','verified','rejected');
CREATE TYPE public.belief_type AS ENUM ('local_belief','traditional_story','cultural_practice','community_perspective');
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.heritage_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.heritage_category NOT NULL,
  city text NOT NULL,
  region text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  description text NOT NULL,
  significance text,
  image_url text,
  festival_date date,
  status public.heritage_status NOT NULL DEFAULT 'pending',
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contributor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.heritage_items TO anon;
GRANT INSERT ON public.heritage_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.heritage_items TO authenticated;
GRANT ALL ON public.heritage_items TO service_role;
ALTER TABLE public.heritage_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads verified items" ON public.heritage_items FOR SELECT TO anon, authenticated USING (status = 'verified');
CREATE POLICY "owners read own items" ON public.heritage_items FOR SELECT TO authenticated USING (submitted_by = auth.uid());
CREATE POLICY "admins read all items" ON public.heritage_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "anyone submits pending items" ON public.heritage_items FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');
CREATE POLICY "admins update items" ON public.heritage_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.local_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  heritage_item_id uuid NOT NULL REFERENCES public.heritage_items(id) ON DELETE CASCADE,
  story_text text NOT NULL,
  belief_type public.belief_type NOT NULL DEFAULT 'community_perspective',
  contributor_name text,
  status public.heritage_status NOT NULL DEFAULT 'pending',
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.local_stories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_stories TO authenticated;
GRANT ALL ON public.local_stories TO service_role;
ALTER TABLE public.local_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads verified stories" ON public.local_stories FOR SELECT TO anon, authenticated USING (status = 'verified');
CREATE POLICY "owners read own stories" ON public.local_stories FOR SELECT TO authenticated USING (submitted_by = auth.uid());
CREATE POLICY "admins read all stories" ON public.local_stories FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "anyone submits pending stories" ON public.local_stories FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');
CREATE POLICY "admins update stories" ON public.local_stories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.heritage_items (id, name, category, city, region, latitude, longitude, description, significance, festival_date, status) VALUES
('11111111-1111-4111-8111-000000000001','Chand Baori Stepwell','monument','Abhaneri','Rajasthan',27.0074,76.6069,'A 13-storey stepwell with 3,500 narrow steps descending into a geometric abyss, built in the 9th century.','One of the deepest and oldest stepwells in India, built to survive Rajasthan''s droughts and to cool the village air.',NULL,'verified'),
('11111111-1111-4111-8111-000000000002','Cheriyal Scroll Painting','art_form','Hyderabad','Telangana',17.3850,78.4867,'A vanishing narrative scroll tradition where 40-foot canvases were painted to accompany travelling bards.','Fewer than a handful of families still practise it; the scrolls carry village versions of the epics found nowhere in print.',NULL,'verified'),
('11111111-1111-4111-8111-000000000003','Bonalu Festival','festival','Hyderabad','Telangana',17.3616,78.4747,'A monsoon festival of the Telangana goddess Mahankali, where women carry decorated pots of rice, milk and jaggery to the temple.','Born from a 19th century plague vow, Bonalu remains a city-wide thanksgiving procession led by women.','2026-07-19','verified'),
('11111111-1111-4111-8111-000000000004','Pattachitra of Raghurajpur','craft','Raghurajpur','Odisha',19.9110,85.8300,'An entire village of painter households working on cloth treated with tamarind paste and chalk.','Every home in Raghurajpur is a workshop; the craft supplies the ritual art of the Jagannath temple.',NULL,'verified'),
('11111111-1111-4111-8111-000000000005','Hampi Ruins','monument','Hampi','Karnataka',15.3350,76.4600,'The boulder-strewn capital of the Vijayanagara Empire, with a stone chariot, musical pillars and river-side bazaars.','A 16th century city of half a million people, abandoned in a single season after 1565.',NULL,'verified'),
('11111111-1111-4111-8111-000000000006','Theyyam Ritual Dance','art_form','Kannur','Kerala',11.8745,75.3704,'Overnight possession performances where a dancer becomes the deity and speaks directly to villagers.','Performed largely by communities historically denied temple entry, making Theyyam a rare space of ritual authority.','2026-12-10','verified'),
('11111111-1111-4111-8111-000000000007','Majuli Mask Making','craft','Majuli','Assam',26.9500,94.1667,'Bamboo, clay and cow dung masks made in the satras of the world''s largest river island.','The masks animate Bhaona theatre begun by the saint Srimanta Sankardeva in the 16th century.',NULL,'verified'),
('11111111-1111-4111-8111-000000000008','Hemis Tsechu','festival','Leh','Ladakh',34.0000,77.6167,'A masked monastery festival in a high desert valley, marking the birth of Padmasambhava.','Held once a year, and every twelfth year the giant Thangka of Guru Rinpoche is unfurled.','2026-06-26','verified'),
('11111111-1111-4111-8111-000000000009','Rani ki Vav','monument','Patan','Gujarat',23.8587,72.1017,'An inverted subterranean temple-stepwell carved with over 800 sculptures of Vishnu''s avatars.','Built by Queen Udayamati in the 11th century and lost to the silt of the Saraswati river for centuries.',NULL,'verified'),
('11111111-1111-4111-8111-00000000000a','Sattriya Dance','art_form','Guwahati','Assam',26.1445,91.7362,'A monastic dance-drama tradition preserved for 500 years inside Assamese satras before reaching public stages.','One of India''s eight classical dance forms, and the last to be recognised as such.',NULL,'verified'),
('11111111-1111-4111-8111-00000000000b','Dhokra Metal Casting','craft','Bikna','West Bengal',23.2324,87.0716,'Lost-wax brass casting practised by the Dhokra Damar tribes for over four thousand years.','The technique is unchanged since the dancing girl of Mohenjo-daro was cast the same way.',NULL,'verified'),
('11111111-1111-4111-8111-00000000000c','Jagannath Rath Yatra','festival','Puri','Odisha',19.8050,85.8180,'Three colossal wooden chariots pulled through Puri by hundreds of thousands of devotees each year.','New chariots are built from scratch every year by hereditary carpenter families using no metal nails.','2026-07-16','verified');

INSERT INTO public.local_stories (heritage_item_id, story_text, belief_type, contributor_name, status) VALUES
('11111111-1111-4111-8111-000000000001','Villagers say the whole baori was raised by spirits in a single night, and that no one should try to count the steps twice — the number is said to change on you.','local_belief','Abhaneri elders','verified'),
('11111111-1111-4111-8111-000000000003','Families believe the goddess returns to her maternal home during Bonalu, so the pot of rice is offered the way a daughter is fed when she visits.','cultural_practice','Old City households','verified'),
('11111111-1111-4111-8111-000000000006','When the Theyyam performer speaks, people do not address the dancer but the deity; grievances about land and family are still brought before him at dawn.','community_perspective','Kannur residents','verified'),
('11111111-1111-4111-8111-00000000000c','It is said that a single touch of the chariot rope frees a person from rebirth, which is why the crowd surges even when the chariot will not move.','traditional_story','Puri sevaks','verified'),
('11111111-1111-4111-8111-000000000004','Painters here will not begin a Jagannath figure without a bath and a prayer, and unfinished eyes are covered overnight so the god does not wake half-seeing.','cultural_practice','Raghurajpur artists','verified');