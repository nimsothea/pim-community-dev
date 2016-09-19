<?php

namespace Pim\Bundle\DataGridBundle\Controller\Rest;

use Akeneo\Component\StorageUtils\Saver\SaverInterface;
use Pim\Bundle\DataGridBundle\Entity\DatagridView;
use Pim\Bundle\DataGridBundle\Manager\DatagridViewManager;
use Pim\Bundle\DataGridBundle\Repository\DatagridViewRepositoryInterface;
use Pim\Bundle\EnrichBundle\Exception\DeleteException;
use Pim\Bundle\EnrichBundle\Flash\Message;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Component\Translation\TranslatorInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Datagrid views REST controller
 *
 * @author    Adrien Pétremann <adrien.petremann@akeneo.com>
 * @copyright 2016 Akeneo SAS (http://www.akeneo.com)
 * @license   http://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class DatagridViewController
{
    /** @var NormalizerInterface */
    protected $normalizer;

    /** @var DatagridViewRepositoryInterface */
    protected $datagridViewRepo;

    /** @var TokenStorageInterface */
    protected $tokenStorage;

    /** @var DatagridViewManager */
    protected $datagridViewManager;

    /** @var SaverInterface */
    protected $saver;

    /** @var ValidatorInterface */
    protected $validator;

    /** @var TranslatorInterface */
    protected $translator;

    /**
     * @param NormalizerInterface             $normalizer
     * @param DatagridViewRepositoryInterface $datagridViewRepo
     * @param TokenStorageInterface           $tokenStorage
     * @param DatagridViewManager             $datagridViewManager
     * @param SaverInterface                  $saver
     * @param ValidatorInterface              $validator
     * @param TranslatorInterface             $translator
     */
    public function __construct(
        NormalizerInterface $normalizer,
        DatagridViewRepositoryInterface $datagridViewRepo,
        TokenStorageInterface $tokenStorage,
        DatagridViewManager $datagridViewManager,
        SaverInterface $saver,
        ValidatorInterface $validator,
        TranslatorInterface $translator
    ) {
        $this->normalizer = $normalizer;
        $this->datagridViewRepo = $datagridViewRepo;
        $this->tokenStorage = $tokenStorage;
        $this->datagridViewManager = $datagridViewManager;
        $this->saver = $saver;
        $this->validator = $validator;
        $this->translator = $translator;
    }

    /**
     * Get the datagrid views collection.
     *
     * @param Request $request
     * @param string  $alias
     *
     * @return JsonResponse
     */
    public function indexAction(Request $request, $alias)
    {
        $user = $this->tokenStorage->getToken()->getUser();

        $options = $request->query->get('options', ['limit' => 20, 'page' => 1, ]);
        $term = $request->query->get('search', '');

        $views = $this->datagridViewRepo->findDatagridViewBySearch($term, $user, $alias, $options);
        $normalizedViews = $this->normalizer->normalize($views, 'array', []);

        return new JsonResponse($normalizedViews);
    }

    /**
     * Get the datagrid view by its $id.
     *
     * @param Request $request
     * @param string  $alias
     * @param string  $identifier
     *
     * @return JsonResponse
     */
    public function getAction(Request $request, $alias, $identifier)
    {
        $user = $this->tokenStorage->getToken()->getUser();

        $view = $this->datagridViewRepo->findOneBy(['owner' => $user, 'datagridAlias' => $alias, 'id' => $identifier]);
        $normalizedView = $this->normalizer->normalize($view, 'array', []);

        return new JsonResponse($normalizedView);
    }

    /**
     * @param Request $request
     * @param string  $alias
     *
     * @return JsonResponse
     */
    public function saveAction(Request $request, $alias)
    {
        $user = $this->tokenStorage->getToken()->getUser();
        $view = $request->request->get('view', null);

        if (null === $view) {
            return new JsonResponse();
        }

        if (isset($view['id'])) {
            // Save existing view
        } else {
            $datagridView = new DatagridView();
            $datagridView->setOwner($user);
            $datagridView->setDatagridAlias($alias);
            $datagridView->setColumns(explode(',', $view['columns']));
            $datagridView->setFilters($view['filters']);
            $datagridView->setLabel($view['label']);

            $violations = $this->validator->validate($datagridView);
            if ($violations->count()) {
                $messages = [];
                foreach ($violations as $violation) {
                    $messages[] = $this->translator->trans($violation->getMessage());
                }

                return new JsonResponse(['errors' => $messages]);
            } else {
                $this->saver->save($datagridView);

                $request->getSession()->getFlashBag()
                    ->add('success', new Message('flash.datagrid view.created'));

                return new JsonResponse(['id' => $datagridView->getId()]);
            }
        }
    }

    /**
     * Remove a datagrid view
     *
     * @param Request $request
     * @param string  $identifier
     *
     * @return JsonResponse
     */
    public function removeAction(Request $request, $identifier)
    {
        $user = $this->tokenStorage->getToken()->getUser();
        $view = $this->datagridViewRepo->findOneBy(['owner' => $user, 'id' => $identifier]);

        if ($view === null) {
            return new JsonResponse(['error' => $this->translator->trans('flash.datagrid view.not removable')], 404);
        }

        $this->datagridViewManager->remove($view);
        $request->getSession()->getFlashBag()
            ->add('success', new Message('flash.datagrid view.removed'));

        return new JsonResponse('', 204);
    }

    /**
     * Get the default view columns for a grid.
     *
     * @param Request $request
     * @param string  $alias
     *
     * @return JsonResponse
     */
    public function defaultViewColumnsAction(Request $request, $alias)
    {
        $columns = array_keys($this->datagridViewManager->getColumnChoices($alias, true));

        return new JsonResponse($columns);
    }

    /**
     * Get the default datagrid view for current user.
     *
     * @param string $alias
     *
     * @return JsonResponse
     */
    public function getUserDefaultDatagridViewAction($alias)
    {
        $user = $this->tokenStorage->getToken()->getUser();
        $view = $user->getDefaultGridView($alias);

        if (null !== $view) {
            $view = $this->normalizer->normalize($view, 'array', []);
        }

        return new JsonResponse(['view' => $view]);
    }
}
